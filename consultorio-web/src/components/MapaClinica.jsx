import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

export default function MapaClinica() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.AIzaSyCM0INMf9jpTn7gR3zI6UV31rQ2M93ZThQ,
  });

  const center = { lat: -23.5147582, lng: -46.7015077 }; // coordenadas da clínica

  if (!isLoaded) return <p className="text-center text-neutral-400">Carregando mapa...</p>;

  return (
    <div className="w-full h-[400px] rounded-2xl overflow-hidden border border-neutral-700 shadow-lg">
      <GoogleMap
        center={center}
        zoom={16}
        mapContainerStyle={{ width: "100%", height: "100%" }}
      >
        <Marker position={center} />
      </GoogleMap>
    </div>
  );
}

