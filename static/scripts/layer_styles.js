export function search_area_style(feature) {
    return {
        fillOpacity: 0,
        color: '#40db69',
        weight: 2,
        dashArray: "10, 5"
    };
}
export function area_style(feature) {
    return {
        fillColor: '#db408b',
        fillOpacity: .3,
        color: '#78254d',
        opacity: 1,
        weight: 2,
    };
}
export function walking_style(feature) {
    return {
        color: '#bf2222',
        opacity: 1,
        weight: 1,
    };
}
export function transit_style(feature) {
    return {
        color: '#bf6622',
        opacity: 1,
        weight: 3,
    };
}