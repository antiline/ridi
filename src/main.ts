type Notification = { message: string; landingUrl: string };

export const requestToRidi = async (url: string, {
	accessToken,
	body,
	contentType = 'json',
	method = 'GET',
}: { accessToken?: string; method?: 'GET' | 'POST'; contentType?: 'json'; body?: Record<string, any> }) => {
	const res = await fetch(url, {
		'headers': {
			'accept': 'application/json, text/plain, */*',
			'accept-language': 'en-US,en;q=0.9,ko;q=0.8',
			'content-type': 'application/json;charset=UTF-8',
			'sec-ch-ua': '"Not?A_Brand";v="8", "Chromium";v="108", "Google Chrome";v="108"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"macOS"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'same-origin',
			...(accessToken ? { 'Cookie': `ridi-at=${accessToken}` } : {}),
		},
		...(body ? { 'body': JSON.stringify(body) } : {}),
		'method': method,
		'mode': 'cors',
		'credentials': 'include',
	});

	if (contentType === 'json') {
		return await res.json();
	}
	return await res.text();
};

export const getAccessToken = async (username: string, password: string): Promise<string> => {
	const response = await requestToRidi('https://account.ridibooks.com/oauth2/token', {
		method: 'POST',
		'body': {
			'username': username,
			'password': password,
			'grant_type': 'password',
			'client_id': 'ePgbKKRyPvdAFzTvFg2DvrS7GenfstHdkQ2uvFNd',
			'auto_login': false,
		},
		contentType: 'json',
	});
	return response.access_token;
};

export const getNotifications = async (accessToken: string): Promise<Notification[]> => {
	const response = await requestToRidi('https://ridibooks.com/api/notification-api/notification?limit=100', {
		accessToken,
	});
	return response.notifications;
};

export const getRainSnowDayPoint = async (url: string, accessToken: string) => {
	await requestToRidi(url, { accessToken });
};

export const findRainSnowDayPointNotification = async (accessToken: string): Notification | undefined => {
	const notifications = await getNotifications(accessToken);
	return notifications.find((it) => it.message.indexOf('오는 날 포인트') !== -1);
};

export const sendToSlack = async (message: string) => {
	const slackWebhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
	if (!slackWebhookUrl) {
		throw new Error('SLACK_WEBHOOK_URL is not set');
	}

	await fetch(slackWebhookUrl, {
		body: JSON.stringify({ 'text': message }),
		method: 'POST',
	}).text();
};

const handler = async () => {
	const ridiUsername = Deno.env.get('RIDI_USERNAME');
	const ridiPassword = Deno.env.get('RIDI_PASSWORD');
	if (!ridiUsername || !ridiPassword) {
		throw new Error('RIDI_USERNAME or RIDI_PASSWORD is not set');
	}

	const accessToken = await getAccessToken(ridiUsername, ridiPassword);
	const rainSnowDayPointNotification = await findRainSnowDayPointNotification(accessToken);

	if (rainSnowDayPointNotification) {
		await getRainSnowDayPoint(point.landingUrl, accessToken);
		await sendToSlack();
	}
};

if (import.meta.main) {
	await handler();
}
