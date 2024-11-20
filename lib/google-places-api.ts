import process from "node:process";
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export async function getPlacePredictions(
  input: string
): Promise<google.maps.places.AutocompletePrediction[]> {
  if (typeof window === "undefined" || !globalThis.google.maps.places) {
    console.error("Google Maps JavaScript API not loaded");
    return [];
  }

  const autocompleteService = new google.maps.places.AutocompleteService();

  return new Promise((resolve, reject) => {
    autocompleteService.getPlacePredictions(
      { input },
      (predictions, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK) {
          console.error("Error fetching place predictions:", status);
          resolve([]); // Resolve with an empty array instead of rejecting
          return;
        }
        resolve(predictions || []);
      }
    );
  });
}

export async function getPlaceDetails(
  placeId: string
): Promise<google.maps.places.PlaceResult> {
  if (typeof window === "undefined" || !globalThis.google.maps.places) {
    console.error("Google Maps JavaScript API not loaded");
    throw new Error("Google Maps JavaScript API not loaded");
  }

  const placesService = new google.maps.places.PlacesService(
    document.createElement("div")
  );

  return new Promise((resolve, reject) => {
    placesService.getDetails({ placeId }, (result, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK) {
        console.error("Error fetching place details:", status);
        reject(new Error(`Failed to fetch place details: ${status}`));
        return;
      }
      resolve(result!);
    });
  });
}
