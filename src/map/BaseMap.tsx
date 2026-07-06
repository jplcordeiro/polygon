import { useRef, type ComponentRef, type ReactNode } from "react";
import Map, { GeolocateControl, NavigationControl } from "react-map-gl/mapbox";
import { toast } from "sonner";

const token = import.meta.env.VITE_MAPBOX_TOKEN;

export interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

export type Bounds = [[number, number], [number, number]];

export function BaseMap({
  showLocation = false,
  initialViewState,
  bounds,
  children,
}: {
  showLocation?: boolean;
  initialViewState?: ViewState;
  bounds?: Bounds;
  children?: ReactNode;
}) {
  const geolocate = useRef<ComponentRef<typeof GeolocateControl>>(null);

  return (
    <Map
      mapboxAccessToken={token}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      style={{ width: "100%", height: "100%" }}
      initialViewState={
        bounds
          ? { bounds, fitBoundsOptions: { padding: 56, maxZoom: 15 } }
          : (initialViewState ?? { longitude: -46.63, latitude: -23.55, zoom: 13 })
      }
      onLoad={() => {
        if (showLocation) geolocate.current?.trigger();
      }}
    >
      {!showLocation && <NavigationControl position="top-right" />}
      {showLocation && (
        <GeolocateControl
          ref={geolocate}
          position="top-right"
          trackUserLocation
          showUserHeading
          positionOptions={{ enableHighAccuracy: true }}
          onError={() =>
            toast.error(
              "Ative a localização do navegador para se orientar no território.",
            )
          }
        />
      )}
      {children}
    </Map>
  );
}
