declare namespace google {
  namespace maps {
    namespace places {
      class AutocompleteService {
        getPlacePredictions(
          request: AutocompletionRequest,
          callback: (
            results: AutocompletePrediction[] | null,
            status: PlacesServiceStatus,
          ) => void,
        ): void;
      }

      class PlacesService {
        constructor(attrContainer: HTMLDivElement);
        getDetails(
          request: PlaceDetailsRequest,
          callback: (
            result: PlaceResult | null,
            status: PlacesServiceStatus,
          ) => void,
        ): void;
      }

      interface AutocompletePrediction {
        description: string;
        place_id: string;
        structured_formatting: {
          main_text: string;
          secondary_text: string;
        };
      }

      interface PlaceResult {
        address_components?: AddressComponent[];
        formatted_address?: string;
        geometry?: {
          location: LatLng;
          viewport: LatLngBounds;
        };
        name?: string;
        place_id?: string;
      }

      interface AddressComponent {
        long_name: string;
        short_name: string;
        types: string[];
      }

      interface AutocompletionRequest {
        input: string;
        componentRestrictions?: { country: string | string[] };
        types?: string[];
      }

      interface PlaceDetailsRequest {
        placeId: string;
        fields?: string[];
      }

      enum PlacesServiceStatus {
        OK,
        ZERO_RESULTS,
        OVER_QUERY_LIMIT,
        REQUEST_DENIED,
        INVALID_REQUEST,
        UNKNOWN_ERROR,
      }
    }

    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }

    class LatLngBounds {
      constructor(sw: LatLng, ne: LatLng);
      getSouthWest(): LatLng;
      getNorthEast(): LatLng;
    }
  }
}
