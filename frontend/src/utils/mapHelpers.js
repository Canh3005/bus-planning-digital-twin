// src/utils/mapHelpers.js
import L from 'leaflet';

/**
 * Fix lỗi icon mặc định của Leaflet trong React
 */
export const fixLeafletDefaultIcon = () => {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  });
};

/**
 * Chuyển đổi GeoJSON LineString thành mảng [lat, lng] cho Leaflet
 */
export const geojsonToLatLng = (geojsonPath) => {
  if (geojsonPath && geojsonPath.coordinates) {
    return geojsonPath.coordinates.map(coord => [coord[1], coord[0]]);
  }
  return [];
};

/**
 * Chuyển đổi GeoJSON Point thành [lat, lng]
 */
export const geojsonPointToLatLng = (geojsonPoint) => {
  if (geojsonPoint && geojsonPoint.coordinates) {
    return [geojsonPoint.coordinates[1], geojsonPoint.coordinates[0]];
  }
  return null;
};
