import db, { upsert } from "../local-cache";

export const saveMarker = attributes => dispatch => {
	return upsert(db, "markers", attributes).then(marker =>
		dispatch({ type: "ADD_MARKER", payload: marker })
	);
};

export const saveMarkers = attributes => dispatch => {
	return upsert(db, "markers", attributes).then(markers =>
		dispatch({ type: "ADD_MARKERS", payload: markers })
	);
};
