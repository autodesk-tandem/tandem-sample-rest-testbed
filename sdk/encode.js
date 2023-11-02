function makeWebsafe(urn) {
	return urn.replace(/\+/g, '-') // Convert '+' to '-' (dash)
		.replace(/\//g, '_') // Convert '/' to '_' (underscore)
		.replace(/=+$/, ''); // Remove trailing '='
}

export {
	makeWebsafe
};
