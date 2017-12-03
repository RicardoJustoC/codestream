import { combineReducers } from "redux";
import onboarding from "./onboarding";
import postsByStream from "./postsByStream";

const initialState = {
	currentFile: "",
	session: {},
	repo: undefined,
	repoMetadata: undefined,
	team: undefined
};

const reduceStreams = (state = [], { type, payload }) => {
	if (type === "ADD_STREAM") return [...state, action.payload];
	else return state;
};

const reduceUsers = (state = [], { type, payload }) => {
	if (type === "ADD_USER") return [...state, payload];
	if (type === "UPDATE_USER") return state.map(user => (user.id === payload.id ? payload : user));
	return state;
};

const reduceTeams = (state = [], { type, payload }) => {
	// is it naive to just replace the existing ones?
	if (type === "ADD_TEAMS") return payload;
	return state;
};

const reduceRepos = (state = [], { type, payload }) => {
	// is it naive to just replace the existing ones?
	if (type === "ADD_REPOS") return payload;
	return state;
};

const reduceSession = (state = {}, { type, payload }) => {
	if (type === "INIT_SESSION") return { accessToken: payload.accessToken, user: payload.user };
	else return state;
};

const reduceRest = combineReducers({
	session: reduceSession,
	streams: reduceStreams,
	users: reduceUsers,
	teams: reduceTeams,
	repos: reduceRepos,
	onboarding,
	postsByStream
});
export default (state = initialState, action) => {
	if (action.type === "ACTIVE_FILE_CHANGED") return { ...state, currentFile: action.payload };
	if (action.type === "ADD_REPO_INFO") return { ...state, ...action.payload };
	else
		return {
			...state,
			...reduceRest(state, action)
		};
};
