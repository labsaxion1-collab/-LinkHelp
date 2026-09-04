import { useEffect, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Loader2, Search, PencilLine } from 'lucide-react';
import { getGoogleMapsApiKey, isGoogleMapsConfigured } from '@/utils/googleMapsConfig';
import { requestBrowserCoordinates } from '@/utils/geocodeLocation';
import { parseGeocoderResult, parsePlaceResult, type ParsedPlace } from '@/utils/parseGooglePlace';

export type RequestAddressValue = {
  address: string;
  city: string;
  region: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  /** Full line shown in the input */
  display: string;
};

export type RequestAddressMode = 'unset' | 'gps' | 'other';

type Props = {
  value: RequestAddressValue;
  onChange: (value: RequestAddressValue) => void;
  locatingLabel: string;
  currentLocationLabel: string;
  currentLocationShortLabel: string;
  /** CTA: choose another service address (not current GPS). */
  otherAddressLabel?: string;
  /** Helper when Maps autocomplete is unavailable. */
  mapsUnavailableLabel?: string;
  /** Prompt to confirm coords after manual entry without geocode. */
  coordsRequiredLabel?: string;
  /** Optional street / city / etc. field labels for manual form. */
  manualStreetLabel?: string;
  manualNumberLabel?: string;
  manualComplementLabel?: string;
  manualCityLabel?: string;
  manualRegionLabel?: string;
  manualPostalLabel?: string;
  placeholder: string;
  onLocationError?: (code: 'denied' | 'unavailable' | 'timeout' | 'unsupported') => void;
};

function emptyValue(display = ''): RequestAddressValue {
  return { address: '', city: '', region: '', postalCode: '', latitude: null, longitude: null, display };
}

function fromParsed(parsed: ParsedPlace): RequestAddressValue {
  return {
    address: parsed.address,
    city: parsed.city,
    region: parsed.region,
    postalCode: parsed.postalCode,
    latitude: parsed.latitude,
    longitude: parsed.longitude,
    display: parsed.formatted,
  };
}

function clearCoordinates(value: RequestAddressValue, display: string): RequestAddressValue {
  return {
    ...value,
    display,
    address: display,
    latitude: null,
    longitude: null,
  };
}

function CtaRow({
  locating,
  locatingLabel,
  currentLocationLabel,
  otherAddressLabel,
  onGps,
  onOther,
  activeMode,
}: {
  locating: boolean;
  locatingLabel: string;
  currentLocationLabel: string;
  otherAddressLabel: string;
  onGps: () => void;
  onOther: () => void;
  activeMode: RequestAddressMode;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <button
        type="button"
        disabled={locating}
        onClick={onGps}
        aria-pressed={activeMode === 'gps'}
        className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border-2 px-3 py-3 text-sm font-bold transition disabled:opacity-60 ${
          activeMode === 'gps'
            ? 'border-blue-500 bg-blue-50 text-blue-700'
            : 'border-slate-200 bg-white text-slate-800 hover:border-blue-300'
        }`}
      >
        {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4 shrink-0" />}
        <span>{locating ? locatingLabel : currentLocationLabel}</span>
      </button>
      <button
        type="button"
        onClick={onOther}
        aria-pressed={activeMode === 'other'}
        className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border-2 px-3 py-3 text-sm font-bold transition ${
          activeMode === 'other'
            ? 'border-blue-500 bg-blue-50 text-blue-700'
            : 'border-slate-200 bg-white text-slate-800 hover:border-blue-300'
        }`}
      >
        <PencilLine className="h-4 w-4 shrink-0" />
        <span>{otherAddressLabel}</span>
      </button>
    </div>
  );
}

function ConfirmedSummary({ value }: { value: RequestAddressValue }) {
  if (!value.display.trim()) return null;
  const hasCoords = value.latitude != null && value.longitude != null;
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5 text-sm">
      <p className="flex items-start gap-2 font-bold text-emerald-950">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
        <span className="min-w-0 break-words">{value.display}</span>
      </p>
      {hasCoords ? (
        <p className="mt-1 pl-6 text-xs font-semibold text-emerald-800/80">
          {value.latitude!.toFixed(5)}, {value.longitude!.toFixed(5)}
        </p>
      ) : (
        <p className="mt-1 pl-6 text-xs font-semibold text-amber-700">
          {/* coords pending — parent can show mapsUnavailable / coordsRequired */}
        </p>
      )}
    </div>
  );
}

function PlacesAutocompleteInner({
  value,
  onChange,
  locatingLabel,
  currentLocationLabel,
  otherAddressLabel = 'Informar outro endereço',
  mapsUnavailableLabel,
  coordsRequiredLabel,
  placeholder,
  onLocationError,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const places = useMapsLibrary('places');
  const [locating, setLocating] = useState(false);
  const [mode, setMode] = useState<RequestAddressMode>(() =>
    value.latitude != null && value.longitude != null ? 'gps' : value.display ? 'other' : 'unset',
  );

  useEffect(() => {
    if (mode !== 'other' || !places || !inputRef.current) return;
    const autocomplete = new places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: ['ca'] },
      fields: ['formatted_address', 'geometry', 'address_components'],
    });
    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const parsed = parsePlaceResult(place);
      if (parsed) {
        setMode('other');
        onChange(fromParsed(parsed));
      }
    });
    return () => {
      listener.remove();
    };
  }, [places, onChange, mode]);

  const useCurrentLocation = () => {
    setMode('gps');
    setLocating(true);
    void requestBrowserCoordinates()
      .then((coords) => {
        if (!coords) {
          setLocating(false);
          onLocationError?.('unavailable');
          return;
        }
        if (!window.google?.maps) {
          setLocating(false);
          onChange({
            ...emptyValue(`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`),
            latitude: coords.lat,
            longitude: coords.lng,
          });
          return;
        }
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: coords }, (results, status) => {
          setLocating(false);
          if (status === 'OK' && results?.[0]) {
            const parsed = parseGeocoderResult(results[0]);
            if (parsed) {
              onChange(fromParsed(parsed));
              return;
            }
          }
          onChange({
            ...emptyValue(`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`),
            latitude: coords.lat,
            longitude: coords.lng,
          });
        });
      })
      .catch(() => {
        setLocating(false);
        onLocationError?.('denied');
      });
  };

  return (
    <div className="space-y-3">
      <CtaRow
        locating={locating}
        locatingLabel={locatingLabel}
        currentLocationLabel={currentLocationLabel}
        otherAddressLabel={otherAddressLabel}
        onGps={useCurrentLocation}
        onOther={() => {
          setMode('other');
          // Do not overwrite an already typed address with GPS.
        }}
        activeMode={mode}
      />
      {mode === 'other' ? (
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={value.display}
            onChange={(e) => {
              const text = e.target.value;
              // Typing clears stale GPS/autocomplete coordinates until a place is chosen.
              onChange(clearCoordinates(value, text));
            }}
            placeholder={placeholder}
            autoComplete="off"
            className="block w-full min-h-[56px] rounded-2xl border-2 border-gray-200 bg-gray-50 p-4 pl-12 text-base font-medium text-gray-900 shadow-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 sm:text-lg"
          />
          {value.display.trim() && (value.latitude == null || value.longitude == null) && coordsRequiredLabel ? (
            <p className="mt-2 text-xs font-semibold text-amber-700">{coordsRequiredLabel}</p>
          ) : null}
        </div>
      ) : null}
      {mode === 'gps' && value.display ? <ConfirmedSummary value={value} /> : null}
      {mode === 'other' && value.latitude != null && value.longitude != null ? (
        <ConfirmedSummary value={value} />
      ) : null}
      {!isGoogleMapsConfigured() && mapsUnavailableLabel ? (
        <p className="text-xs font-semibold text-slate-500">{mapsUnavailableLabel}</p>
      ) : null}
    </div>
  );
}

function ManualAddressInput({
  value,
  onChange,
  locatingLabel,
  currentLocationLabel,
  otherAddressLabel = 'Informar outro endereço',
  mapsUnavailableLabel,
  coordsRequiredLabel,
  manualStreetLabel = 'Rua',
  manualNumberLabel = 'Número',
  manualComplementLabel = 'Complemento',
  manualCityLabel = 'Cidade',
  manualRegionLabel = 'Província',
  manualPostalLabel = 'Código postal',
  onLocationError,
}: Props) {
  const [locating, setLocating] = useState(false);
  const [mode, setMode] = useState<RequestAddressMode>(() =>
    value.latitude != null && value.longitude != null ? 'gps' : value.display ? 'other' : 'unset',
  );
  const [street, setStreet] = useState(value.address);
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [city, setCity] = useState(value.city);
  const [region, setRegion] = useState(value.region);
  const [postal, setPostal] = useState(value.postalCode);

  const syncManual = (next: {
    street?: string;
    number?: string;
    complement?: string;
    city?: string;
    region?: string;
    postal?: string;
  }) => {
    const s = next.street ?? street;
    const n = next.number ?? number;
    const c = next.complement ?? complement;
    const ci = next.city ?? city;
    const r = next.region ?? region;
    const p = next.postal ?? postal;
    const line = [s, n, c, ci, r, p].map((x) => x.trim()).filter(Boolean).join(', ');
    onChange({
      address: [s, n].filter(Boolean).join(', '),
      city: ci,
      region: r,
      postalCode: p,
      latitude: null,
      longitude: null,
      display: line,
    });
  };

  const useCurrentLocation = () => {
    setMode('gps');
    setLocating(true);
    void requestBrowserCoordinates()
      .then((coords) => {
        setLocating(false);
        if (!coords) {
          onLocationError?.('unavailable');
          return;
        }
        onChange({
          ...emptyValue(`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`),
          latitude: coords.lat,
          longitude: coords.lng,
        });
      })
      .catch(() => {
        setLocating(false);
        onLocationError?.('denied');
      });
  };

  return (
    <div className="space-y-3">
      <CtaRow
        locating={locating}
        locatingLabel={locatingLabel}
        currentLocationLabel={currentLocationLabel}
        otherAddressLabel={otherAddressLabel}
        onGps={useCurrentLocation}
        onOther={() => setMode('other')}
        activeMode={mode}
      />
      {mapsUnavailableLabel ? (
        <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          {mapsUnavailableLabel}
        </p>
      ) : null}
      {mode === 'other' ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="sm:col-span-2 text-xs font-bold text-slate-700">
            {manualStreetLabel}
            <input
              className="mt-1 w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-sm font-medium"
              value={street}
              onChange={(e) => {
                setStreet(e.target.value);
                syncManual({ street: e.target.value });
              }}
            />
          </label>
          <label className="text-xs font-bold text-slate-700">
            {manualNumberLabel}
            <input
              className="mt-1 w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-sm font-medium"
              value={number}
              onChange={(e) => {
                setNumber(e.target.value);
                syncManual({ number: e.target.value });
              }}
            />
          </label>
          <label className="text-xs font-bold text-slate-700">
            {manualComplementLabel}
            <input
              className="mt-1 w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-sm font-medium"
              value={complement}
              onChange={(e) => {
                setComplement(e.target.value);
                syncManual({ complement: e.target.value });
              }}
            />
          </label>
          <label className="text-xs font-bold text-slate-700">
            {manualCityLabel}
            <input
              className="mt-1 w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-sm font-medium"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                syncManual({ city: e.target.value });
              }}
            />
          </label>
          <label className="text-xs font-bold text-slate-700">
            {manualRegionLabel}
            <input
              className="mt-1 w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-sm font-medium"
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                syncManual({ region: e.target.value });
              }}
            />
          </label>
          <label className="sm:col-span-2 text-xs font-bold text-slate-700">
            {manualPostalLabel}
            <input
              className="mt-1 w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-sm font-medium"
              value={postal}
              onChange={(e) => {
                setPostal(e.target.value);
                syncManual({ postal: e.target.value });
              }}
            />
          </label>
          {coordsRequiredLabel ? (
            <p className="sm:col-span-2 text-xs font-semibold text-amber-700">{coordsRequiredLabel}</p>
          ) : null}
        </div>
      ) : null}
      {mode === 'gps' && value.display ? <ConfirmedSummary value={value} /> : null}
    </div>
  );
}

export function RequestAddressInput(props: Props) {
  if (!isGoogleMapsConfigured()) {
    return <ManualAddressInput {...props} />;
  }
  return (
    <APIProvider apiKey={getGoogleMapsApiKey()} version="weekly" libraries={['places']}>
      <PlacesAutocompleteInner {...props} />
    </APIProvider>
  );
}

export { emptyValue as emptyRequestAddress };
