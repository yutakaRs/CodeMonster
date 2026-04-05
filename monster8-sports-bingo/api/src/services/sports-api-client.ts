const BASE_URL = "https://api.sportsgameodds.com/v2";

export interface SportsApiClientOptions {
  apiKey: string;
}

export class SportsApiClient {
  private apiKey: string;

  constructor(opts: SportsApiClientOptions) {
    this.apiKey = opts.apiKey;
  }

  async request<T = unknown>(
    endpoint: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${BASE_URL}${endpoint}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "X-Api-Key": this.apiKey },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `SportsGameOdds API error ${response.status}: ${body.slice(0, 200)}`,
      );
    }

    const json = (await response.json()) as { success: boolean; data: T };
    if (!json.success) {
      throw new Error("SportsGameOdds API returned success=false");
    }

    return json.data;
  }

  sports() {
    return this.request("/sports/");
  }

  leagues(params?: Record<string, string>) {
    return this.request("/leagues/", params);
  }

  teams(params?: Record<string, string>) {
    return this.request("/teams/", params);
  }

  events(params?: Record<string, string>) {
    return this.request("/events/", params);
  }

  accountUsage() {
    return this.request("/account/usage/");
  }
}
