import { useEffect, useRef, useState, type RefObject } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import {
  attachGoogleMapsAuthFailureListener,
  getGoogleMapsApiKey,
  isGoogleMapsConfigured,
} from '@/utils/googleMapsConfig';
import { requestHomeBaseGpsCoordinates, type GeolocationFailureReason } from '@/utils/geocodeLocation';
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
  mapsUnavailableMessage?: string;
  gpsHomeWarning?: string;
  gpsStatusPendingLabel?: string;
  gpsStatusConfirmedLabel?: string;
  emphasizeGpsButton?: boolean;
  onLocationError?: (reason?: GeolocationFailureReason) => void;
  onLocationPartial?: () => void;
  onLocationSuccess?: () => void;
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

/** Manual edits to the street line clear pin coords so stale lat/lng cannot be saved. */
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

export function helperBaseAddressFromManualField(
  prev: HelperBaseAddressValue,
  field: 'city' | 'province' | 'postalCode',
  text: string,
): HelperBaseAddressValue {
  return {
    ...prev,
    [field]: text,
    latitude: null,
    longitude: null,
  };
}

export function helperBaseHasGpsConfirmation(value: HelperBaseAddressValue): boolean {
  return (
    typeof value.latitude === 'number' &&
    Number.isFinite(value.latitude) &&
    typeof value.longitude === 'number' &&
    Number.isFinite(value.longitude)
  );
}

/** Persist GPS as the official home base without rewriting typed address fields. */
export function applyCapturedGpsToHelperBase(
  prev: HelperBaseAddressValue,
  coords: { lat: number; lng: number },
): HelperBaseAddressValue {
  return {
    ...prev,
    latitude: coords.lat,
    longitude: coords.lng,
  };
}

export async function captureHomeBaseGps(
  prev: HelperBaseAddressValue,
): Promise<
  | { ok: true; value: HelperBaseAddressValue }
  | { ok: false; reason: GeolocationFailureReason }
> {
  const geo = await requestHomeBaseGpsCoordinates();
  if (geo.ok === false) return { ok: false, reason: geo.reason };
  return { ok: true, value: applyCapturedGpsToHelperBase(prev, geo.coords) };
}

const fieldClass =
  'mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500';

function EditableRegionFields({
  value,
  onChange,
  disabled,
  cityLabel,
  provinceLabel,
  postalCodeLabel,
}: {
  value: HelperBaseAddressValue;
  onChange: (value: HelperBaseAddressValue) => void;
  disabled?: boolean;
  cityLabel: string;
  provinceLabel: string;
  postalCodeLabel: string;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-gray-700">
          {cityLabel}
          <input
            value={value.city}
            disabled={disabled}
            onChange={(e) => onChange(helperBaseAddressFromManualField(value, 'city', e.target.value))}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm font-semibold text-gray-700">
          {provinceLabel}
          <input
            value={value.province}
            disabled={disabled}
            onChange={(e) => onChange(helperBaseAddressFromManualField(value, 'province', e.target.value))}
            className={fieldClass}
          />
        </label>
      </div>
      <label className="block text-sm font-semibold text-gray-700">
        {postalCodeLabel}
        <input
          value={value.postalCode}
          disabled={disabled}
          onChange={(e) => onChange(helperBaseAddressFromManualField(value, 'postalCode', e.target.value))}
          className={fieldClass}
        />
      </label>
    </>
  );
}

function StreetRow({
  inputRef,
  draft,
  disabled,
  locating,
  placeholder,
  locatingLabel,
  currentLocationLabel,
  currentLocationShortLabel,
  onDraftChange,
  onGpsClick,
  onFocus,
  onBlur,
  emphasizeGpsButton = false,
}: {
  inputRef?: RefObject<HTMLInputElement | null>;
  draft: string;
  disabled?: boolean;
  locating: boolean;
  placeholder: string;
  locatingLabel: string;
  currentLocationLabel: string;
  currentLocationShortLabel: string;
  onDraftChange: (text: string) => void;
  onGpsClick: () => void;
  onFocus: () => void;
  onBlur: () => void;
  emphasizeGpsButton?: boolean;
}) {
  return (
    <div className="relative">
      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        type="text"
        value={draft}
        disabled={disabled}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(e) => onDraftChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={`${fieldClass} pl-9 pr-28`}
      />
      <button
        type="button"
        disabled={disabled || locating}
        onClick={onGpsClick}
        className={`absolute right-2 top-1/2 flex min-h-[36px] -translate-y-1/2 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold disabled:opacity-50 ${
          emphasizeGpsButton
            ? 'bg-amber-100 text-amber-900 ring-2 ring-amber-400 hover:bg-amber-200'
            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
        }`}
        data-testid="helper-base-gps-button"
      >
        {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{locating ? locatingLabel : currentLocationLabel}</span>
        <span className="sm:hidden">{locating ? '…' : currentLocationShortLabel}</span>
      </button>
    </div>
  );
}

function PlacesStreetInner({
  value,
  onChange,
  disabled,
  draft,
  setDraft,
  locating,
  onGpsClick,
  locatingLabel,
  currentLocationLabel,
  currentLocationShortLabel,
  placeholder,
  emphasizeGpsButton = false,
}: {
  value: HelperBaseAddressValue;
  onChange: (value: HelperBaseAddressValue) => void;
  disabled?: boolean;
  draft: string;
  setDraft: (text: string) => void;
  locating: boolean;
  onGpsClick: () => void;
  locatingLabel: string;
  currentLocationLabel: string;
  currentLocationShortLabel: string;
  placeholder: string;
  emphasizeGpsButton?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const places = useMapsLibrary('places');
  const focusedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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
  }, [places, disabled, setDraft]);

  return (
    <StreetRow
      inputRef={inputRef}
      draft={draft}
      disabled={disabled}
      locating={locating}
      placeholder={placeholder}
      locatingLabel={locatingLabel}
      currentLocationLabel={currentLocationLabel}
      currentLocationShortLabel={currentLocationShortLabel}
      onDraftChange={(text) => {
        setDraft(text);
        onChange(helperBaseAddressFromTypedDisplay(value, text));
      }}
      onGpsClick={onGpsClick}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onBlur={() => {
        focusedRef.current = false;
      }}
      emphasizeGpsButton={emphasizeGpsButton}
    />
  );
}

function HelperBaseAddressInputInner(props: Props) {
  const {
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
    mapsUnavailableMessage,
    gpsHomeWarning,
    gpsStatusPendingLabel,
    gpsStatusConfirmedLabel,
    emphasizeGpsButton = false,
    onLocationError,
    onLocationPartial,
    onLocationSuccess,
  } = props;

  const [draft, setDraft] = useState(value.display);
  const [locating, setLocating] = useState(false);
  const [mapsFailed, setMapsFailed] = useState(false);
  const focusedRef = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (focusedRef.current) return;
    setDraft(value.display);
  }, [value.display]);

  useEffect(() => {
    return attachGoogleMapsAuthFailureListener(() => {
      setMapsFailed(true);
    });
  }, []);

  const mapsConfigured = isGoogleMapsConfigured();
  const usePlaces = mapsConfigured && !mapsFailed;
  const showMapsUnavailable = Boolean(mapsUnavailableMessage) && (!mapsConfigured || mapsFailed);
  const gpsConfirmed = helperBaseHasGpsConfirmation(value);

  const useGps = () => {
    if (disabled) return;
    setLocating(true);
    void captureHomeBaseGps(valueRef.current)
      .then((result) => {
        if (result.ok === false) {
          onLocationError?.(result.reason);
          return;
        }
        onChange(result.value);
        onLocationSuccess?.();
        onLocationPartial?.();
      })
      .finally(() => setLocating(false));
  };

  return (
    <div className="space-y-3">
      {showMapsUnavailable ? (
        <p
          data-testid="helper-base-maps-unavailable"
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600"
        >
          {mapsUnavailableMessage}
        </p>
      ) : null}
      {gpsHomeWarning ? (
        <p data-testid="helper-base-gps-home-warning" className="text-[11px] font-medium leading-5 text-slate-500">
          {gpsHomeWarning}
        </p>
      ) : null}
      {gpsStatusPendingLabel || gpsStatusConfirmedLabel ? (
        <p
          data-testid={gpsConfirmed ? 'helper-base-gps-status-confirmed' : 'helper-base-gps-status-pending'}
          className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
            gpsConfirmed
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {gpsConfirmed ? gpsStatusConfirmedLabel : gpsStatusPendingLabel}
        </p>
      ) : null}
      {usePlaces ? (
        <APIProvider apiKey={getGoogleMapsApiKey()} version="weekly" libraries={['places']}>
          <PlacesStreetInner
            value={value}
            onChange={onChange}
            disabled={disabled}
            draft={draft}
            setDraft={setDraft}
            locating={locating}
            onGpsClick={useGps}
            locatingLabel={locatingLabel}
            currentLocationLabel={currentLocationLabel}
            currentLocationShortLabel={currentLocationShortLabel}
            placeholder={placeholder}
            emphasizeGpsButton={emphasizeGpsButton}
          />
        </APIProvider>
      ) : (
        <StreetRow
          draft={draft}
          disabled={disabled}
          locating={locating}
          placeholder={placeholder}
          locatingLabel={locatingLabel}
          currentLocationLabel={currentLocationLabel}
          currentLocationShortLabel={currentLocationShortLabel}
          emphasizeGpsButton={emphasizeGpsButton}
          onDraftChange={(text) => {
            setDraft(text);
            onChange(helperBaseAddressFromTypedDisplay(value, text));
          }}
          onGpsClick={useGps}
          onFocus={() => {
            focusedRef.current = true;
          }}
          onBlur={() => {
            focusedRef.current = false;
          }}
        />
      )}
      <EditableRegionFields
        value={value}
        onChange={onChange}
        disabled={disabled}
        cityLabel={cityLabel}
        provinceLabel={provinceLabel}
        postalCodeLabel={postalCodeLabel}
      />
    </div>
  );
}

export function HelperBaseAddressInput(props: Props) {
  return <HelperBaseAddressInputInner {...props} />;
}
