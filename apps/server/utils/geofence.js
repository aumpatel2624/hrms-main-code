export const haversineDistance = (latitude1, longitude1, latitude2, longitude2) => {
  const radians = degrees => degrees * Math.PI / 180;
  const deltaLat = radians(latitude2 - latitude1);
  const deltaLon = radians(longitude2 - longitude1);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(latitude1)) * Math.cos(radians(latitude2)) * Math.sin(deltaLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
};
