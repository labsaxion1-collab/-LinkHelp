import { useEffect, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { getGoogleMapsApiKey, isGoogleMapsConfigured } from '@/utils/googleMapsConfig';
import { requestBrowserCoordinates } from '@/utils/geocodeLocation';
import { parseGeocoderResult, parsePlaceResult, type ParsedPlace } from '@/utils/parseGooglePlace';

export type RequestAddressValue = {
  address: string;
  city: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  /** Full line shown in the input */
  display: string;
};

type Props = {
  value: RequestAddressValue;
  onChange: (value: RequestAddressValue) => void;
  locatingLabel: string;
  currentLocationLabel: string;
  currentLocationShortLabel: string;
  placeholder: string;
};

function emptyValue(display = ''): RequestAddressValue {
  return { address: '', city: '', region: '', latitude: null, longitude: null, display };
}

function fromParsed(parsed: ParsedPlace): RequestAddressValue {
  return {
    address: parsed.address,
    city: parsed.city,
    region: parsed.region,
    latitude: parsed.latitude,
    longitude: parsed.longitude,
    display: parsed.formatted,
  };
}

function PlacesAutocompleteInner({
  value,
  onChange,
  locatingLabel,
  currentLocationLabel,
  currentLocationShortLabel,
  placeholder,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const places = useMapsLibrary('places');
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!places || !inputRef.current) return;
    const autocomplete = new places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: ['ca'] },
      fields: ['formatted_address', 'geometry', 'address_components'],
    });
    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const parsed = parsePlaceResult(place);
      if (parsed) onChange(fromParsed(parsed));
    });
    return () => {
      listener.remove();
    };
  }, [places, onChange]);

  const useCurrentLocation = () => {
    setLocating(true);
    void requestBrowserCoordinates().then((coords) => {
      if (!coords || !window.google?.maps) {
        setLocating(false);
        return;
      }
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: coords }, (results, status) => {
        setLocating(false);
        if (status === 'OK' && results?.[0]) {
          const parsed = parseGeocoderResult(results[0]);
          if (parsed) {
            onChange(fromParsed(parsed));
            if (inputRef.current) inputRef.current.value = parsed.formatted;
            return;
          }
        }
        onChange({
          ...emptyValue(`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`),
          latitude: coords.lat,
          longitude: coords.lng,
        });
      });
    });
  };

  return (
    <div className="relative">
      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={value.display}
        onChange={(e) => {
          const text = e.target.value;
          onChange({ ...value, display: text, address: text });
        }}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full pl-14 pr-[7.5rem] sm:pr-44 bg-gray-50 border-2 border-gray-200 text-gray-900 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white block p-4 text-base sm:text-lg transition-all outline-none font-medium shadow-sm min-h-[56px]"
      />
      <button
        type="button"
        disabled={locating}
        onClick={useCurrentLocation}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sm:text-sm font-bold text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 px-3 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-60 min-h-[44px]"
      >
        {locating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Navigation className="w-4 h-4 shrink-0" />
        )}
        <span className="hidden sm:inline">{locating ? locatingLabel : currentLocationLabel}</span>
        <span className="sm:hidden">{locating ? '…' : currentLocationShortLabel}</span>
      </button>
    </div>
  );
}

function ManualAddressInput(props: Props) {
  const [locating, setLocating] = useState(false);
  const { value, onChange, placeholder, currentLocationLabel, currentLocationShortLabel } = props;

  const useCurrentLocation = () => {
    setLocating(true);
    void requestBrowserCoordinates().then((coords) => {
      setLocating(false);
      if (!coords) return;
      onChange({
        ...value,
        display: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
        latitude: coords.lat,
        longitude: coords.lng,
      });
    });
  };

  return (
    <div className="relative">
      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={value.display}
        onChange={(e) => {
          const text = e.target.value;
          onChange({ ...value, display: text, address: text });
        }}
        placeholder={placeholder}
        className="w-full pl-14 pr-[7.5rem] sm:pr-44 bg-gray-50 border-2 border-gray-200 text-gray-900 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white block p-4 text-base sm:text-lg transition-all outline-none font-medium shadow-sm min-h-[56px]"
      />
      <button
        type="button"
        disabled={locating}
        onClick={useCurrentLocation}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sm:text-sm font-bold text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 px-3 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-60 min-h-[44px]"
      >
        {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4 shrink-0" />}
        <span className="hidden sm:inline">{currentLocationLabel}</span>
        <span className="sm:hidden">{currentLocationShortLabel}</span>
      </button>
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
