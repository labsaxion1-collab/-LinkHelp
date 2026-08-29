import { useEffect, useRef, useState, type RefObject } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { getGoogleMapsApiKey, isGoogleMapsConfigured } from '@/utils/googleMapsConfig';
import { requestBrowserCoordinatesDetailed } from '@/utils/geocodeLocation';
import { reverseGeocodeCoordinates } from '@/utils/reverseGeocodeCoordinates';
import { parsePlaceResult, type ParsedPlace } from '@/utils/parseGooglePlace';

export type HelperBaseAddressValue = {
  address: string;
  city: string;
  province: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  display: string;
};

type Props = {
  value: HelperBaseAddressValue;
  onChange: (value: HelperBaseAddressValue) => void;
  disabled?: boolean;
  locatingLabel: string;
  currentLocationLabel: string;
  currentLocationShortLabel: string;
  placeholder: string;
  cityLabel: string;
  provinceLabel: string;
  postalCodeLabel: string;
  onLocationError?: () => void;
  onLocationPartial?: () => void;
};

export function emptyHelperBaseAddress(display = ''): HelperBaseAddressValue {
  return {
    address: '',
    city: '',
    province: '',
    postalCode: '',
    latitude: null,
    longitude: null,
    display,
  };
}

export function helperBaseAddressFromProfile(profile: {
  helper_base_address?: string | null;
  helper_base_city?: string | null;
  helper_base_province?: string | null;
  helper_base_postal_code?: string | null;
  helper_base_lat?: number | null;
  helper_base_lng?: number | null;
}): HelperBaseAddressValue {
  const address = profile.helper_base_address?.trim() ?? '';
  const city = profile.helper_base_city?.trim() ?? '';
  const province = profile.helper_base_province?.trim() ?? '';
  const postalCode = profile.helper_base_postal_code?.trim() ?? '';
  const display = [address, city, province, postalCode].filter(Boolean).join(', ');
  return {
    address,
    city,
    province,
    postalCode,
    latitude: profile.helper_base_lat ?? null,
    longitude: profile.helper_base_lng ?? null,
    display,
  };
}

function fromParsed(parsed: ParsedPlace): HelperBaseAddressValue {
  return {
    address: parsed.address,
    city: parsed.city,
    province: parsed.region,
    postalCode: parsed.postalCode,
    latitude: parsed.latitude,
    longitude: parsed.longitude,
    display: parsed.formatted,
  };
}

/** Manual edits to the search line clear pin coords so stale lat/lng cannot be saved. */
export function helperBaseAddressFromTypedDisplay(
  prev: HelperBaseAddressValue,
  text: string,
): HelperBaseAddressValue {
  return {
    ...prev,
    display: text,
    address: text,
    latitude: null,
    longitude: null,
  };
}

async function applyGpsToAddress(
  onChange: Props['onChange'],
  opts: {
    disabled?: boolean;
    onLocationError?: () => void;
    onLocationPartial?: () => void;
    inputRef?: RefObject<HTMLInputElement | null>;
  },
): Promise<void> {
  if (opts.disabled) return;

  const geo = await requestBrowserCoordinatesDetailed();
  if (!geo.ok) {
    opts.onLocationError?.();
    return;
  }

  const parsed = await reverseGeocodeCoordinates(geo.coords);
  if (parsed) {
    onChange(fromParsed(parsed));
    if (opts.inputRef?.current) opts.inputRef.current.value = parsed.formatted;
    return;
  }

  onChange({
    ...emptyHelperBaseAddress(`${geo.coords.lat.toFixed(5)}, ${geo.coords.lng.toFixed(5)}`),
    latitude: geo.coords.lat,
    longitude: geo.coords.lng,
  });
  opts.onLocationPartial?.();
}

const fieldClass =
  'mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500';
const derivedFieldClass =
  'mt-1 block w-full cursor-default rounded-xl border border-gray-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-600';

function DerivedFields({
  value,
  cityLabel,
  provinceLabel,
  postalCodeLabel,
}: {
  value: HelperBaseAddressValue;
  cityLabel: string;
  provinceLabel: string;
  postalCodeLabel: string;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-gray-700">
          {cityLabel}
          <input value={value.city} readOnly tabIndex={-1} className={derivedFieldClass} />
        </label>
        <label className="block text-sm font-semibold text-gray-700">
          {provinceLabel}
          <input value={value.province} readOnly tabIndex={-1} className={derivedFieldClass} />
        </label>
      </div>
      <label className="block text-sm font-semibold text-gray-700">
        {postalCodeLabel}
        <input value={value.postalCode} readOnly tabIndex={-1} className={derivedFieldClass} />
      </label>
    </>
  );
}

function PlacesAutocompleteInner({
  value,
  onChange,
  disabled = false,
  locatingLabel,
  currentLocationLabel,
  currentLocationShortLabel,
  placeholder,
  cityLabel,
  provinceLabel,
  postalCodeLabel,
  onLocationError,
  onLocationPartial,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const places = useMapsLibrary('places');
  const [locating, setLocating] = useState(false);
  const [draft, setDraft] = useState(value.display);
  const focusedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (focusedRef.current) return;
    setDraft(value.display);
  }, [value.display]);

  useEffect(() => {
    if (!places || !inputRef.current || disabled) return;
    const autocomplete = new places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: ['ca'] },
      fields: ['formatted_address', 'geometry', 'address_components'],
    });
    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const parsed = parsePlaceResult(place);
      if (!parsed) return;
      const next = fromParsed(parsed);
      focusedRef.current = false;
      setDraft(next.display);
      onChangeRef.current(next);
    });
    return () => {
      listener.remove();
    };
  }, [places, disabled]);

  const useCurrentLocation = () => {
    setLocating(true);
    void applyGpsToAddress(
      (next) => {
        setDraft(next.display);
        onChange(next);
      },
      {
        disabled,
        onLocationError,
        onLocationPartial,
        inputRef,
      },
    ).finally(() => setLocating(false));
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={draft}
          disabled={disabled}
          onFocus={() => {
            focusedRef.current = true;
          }}
          onBlur={() => {
            focusedRef.current = false;
          }}
          onChange={(e) => {
            const text = e.target.value;
            setDraft(text);
            onChange(helperBaseAddressFromTypedDisplay(value, text));
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={`${fieldClass} pl-9 pr-28`}
        />
        <button
          type="button"
          disabled={disabled || locating}
          onClick={useCurrentLocation}
          className="absolute right-2 top-1/2 flex min-h-[36px] -translate-y-1/2 items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{locating ? locatingLabel : currentLocationLabel}</span>
          <span className="sm:hidden">{locating ? '…' : currentLocationShortLabel}</span>
        </button>
      </div>
      <DerivedFields
        value={value}
        cityLabel={cityLabel}
        provinceLabel={provinceLabel}
        postalCodeLabel={postalCodeLabel}
      />
    </div>
  );
}

function ManualAddressInput(props: Props) {
  const [locating, setLocating] = useState(false);
  const {
    value,
    onChange,
    disabled = false,
    placeholder,
    locatingLabel,
    currentLocationLabel,
    currentLocationShortLabel,
    cityLabel,
    provinceLabel,
    postalCodeLabel,
    onLocationError,
    onLocationPartial,
  } = props;
  const [draft, setDraft] = useState(value.display);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (focusedRef.current) return;
    setDraft(value.display);
  }, [value.display]);

  const useCurrentLocation = () => {
    setLocating(true);
    void applyGpsToAddress(
      (next) => {
        setDraft(next.display);
        onChange(next);
      },
      {
        disabled,
        onLocationError,
        onLocationPartial,
      },
    ).finally(() => setLocating(false));
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={draft}
          disabled={disabled}
          onFocus={() => {
            focusedRef.current = true;
          }}
          onBlur={() => {
            focusedRef.current = false;
          }}
          onChange={(e) => {
            const text = e.target.value;
            setDraft(text);
            onChange(helperBaseAddressFromTypedDisplay(value, text));
          }}
          placeholder={placeholder}
          className={`${fieldClass} pl-9 pr-28`}
        />
        <button
          type="button"
          disabled={disabled || locating}
          onClick={useCurrentLocation}
          className="absolute right-2 top-1/2 flex min-h-[36px] -translate-y-1/2 items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{locating ? locatingLabel : currentLocationLabel}</span>
          <span className="sm:hidden">{locating ? '…' : currentLocationShortLabel}</span>
        </button>
      </div>
      <DerivedFields
        value={value}
        cityLabel={cityLabel}
        provinceLabel={provinceLabel}
        postalCodeLabel={postalCodeLabel}
      />
    </div>
  );
}

function HelperBaseAddressInputInner(props: Props) {
  if (!isGoogleMapsConfigured()) {
    return <ManualAddressInput {...props} />;
  }
  return (
    <APIProvider apiKey={getGoogleMapsApiKey()} version="weekly" libraries={['places']}>
      <PlacesAutocompleteInner {...props} />
    </APIProvider>
  );
}

export function HelperBaseAddressInput(props: Props) {
  return <HelperBaseAddressInputInner {...props} />;
}
