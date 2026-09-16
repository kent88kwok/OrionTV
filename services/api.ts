import AsyncStorage from "@react-native-async-storage/async-storage";
// PR #278 的核心修复：OrionTV 已依赖 @react-native-cookies/cookies 却从未使用。
// RN 的 fetch 没有 cookie jar，登录后必须把会话 cookie 显式回传，否则后续请求 401/500（见 issue #272）。
import CookieManager from "@react-native-cookies/cookies";

// region: --- Interface Definitions ---
export interface DoubanItem {
  title: string;
  poster: string;
  rate?: string;
}

export interface DoubanResponse {
  code: number;
  message: string;
  list: DoubanItem[];
}

export interface VideoDetail {
  id: string;
  title: string;
  poster: string;
  source: string;
  source_name: string;
  desc?: string;
  type?: string;
  year?: string;
  area?: string;
  director?: string;
  actor?: string;
  remarks?: string;
}

export interface SearchResult {
  id: number;
  title: string;
  poster: string;
  episodes: string[];
  source: string;
  source_name: string;
  class?: string;
  year: string;
  desc?: string;
  type_name?: string;
}

export interface Favorite {
  cover: string;
  title: string;
  source_name: string;
  total_episodes: number;
  search_title: string;
  year: string;
  save_time?: number;
}

export interface PlayRecord {
  title: string;
  source_name: string;
  cover: string;
  index: number;
  total_episodes: number;
  play_time: number;
  total_time: number;
  save_time: number;
  year: string;
}

export interface ApiSite {
  key: string;
  api: string;
  name: string;
  detail?: string;
}

export interface ServerConfig {
  SiteName: string;
  StorageType: "localstorage" | "redis" | string;
}

export class API {
  public baseURL: string = "";

  constructor(baseURL?: string) {
    if (baseURL) {
      this.baseURL = baseURL;
    }
  }

  public setBaseUrl(url: string) {
    this.baseURL = url;
  }

  private async _fetch(
    url: string,
    options: RequestInit & { skipAuth?: boolean } = {}
  ): Promise<Response> {
    if (!this.baseURL) {
      throw new Error("API_URL_NOT_SET");
    }

    const { skipAuth, ...fetchOptions } = options;

    // 关键修复：从 AsyncStorage 读取登录时保存的会话 cookie 并回传到请求头。
    const authToken = await AsyncStorage.getItem("authCookies");
    const headers: Record<string, string> = {
      ...(fetchOptions.headers as Record<string, string> | undefined),
    };
    if (authToken && authToken.trim() && !skipAuth) {
      headers["Cookie"] = authToken;
    }

    const response = await fetch(`${this.baseURL}${url}`, {
      ...fetchOptions,
      headers,
      // 双保险：同时让原生 cookie 管理器参与（iOS/Android）
      credentials: skipAuth ? "omit" : "include",
    });

    if (response.status === 401) {
      throw new Error("UNAUTHORIZED");
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  }

  async login(username?: string | undefined, password?: string): Promise<{ ok: boolean }> {
    const response = await this._fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      skipAuth: true, // 登录本身不需要携带旧 cookie
    });

    // 保存会话 cookie（兼容 RN fetch 不暴露 Set-Cookie 的情况）
    const cookies = response.headers.get("Set-Cookie");
    if (cookies) {
      // 只保留 name=value 片段，避免把 Path/HttpOnly 等属性当作 Cookie 值发出去
      const clean = cookies.split(";")[0].trim();
      await AsyncStorage.setItem("authCookies", clean);
      try {
        await CookieManager.setFromResponse(this.baseURL, cookies);
      } catch {
        // 忽略原生 cookie 管理器异常
      }
    } else {
      // RN fetch 拿不到 Set-Cookie 时，退回读取原生 cookie jar
      try {
        const native = await CookieManager.get(this.baseURL);
        const cookieStr = Object.values(native)
          .map((c: any) => `${c.name}=${c.value}`)
          .join("; ");
        if (cookieStr) {
          await AsyncStorage.setItem("authCookies", cookieStr);
        }
      } catch {
        // 忽略
      }
    }

    return response.json();
  }

  async logout(): Promise<{ ok: boolean }> {
    const response = await this._fetch("/api/logout", {
      method: "POST",
    });
    await AsyncStorage.setItem("authCookies", "");
    try {
      await CookieManager.clearAll();
    } catch {
      // 忽略
    }
    return response.json();
  }

  async getServerConfig(): Promise<ServerConfig> {
    // 未登录时也要能拿到 server-config（PR #278）
    const response = await this._fetch("/api/server-config", { skipAuth: true });
    return response.json();
  }

  async getFavorites(key?: string): Promise<Record<string, Favorite> | Favorite | null> {
    const url = key ? `/api/favorites?key=${encodeURIComponent(key)}` : "/api/favorites";
    const response = await this._fetch(url);
    return response.json();
  }

  async addFavorite(key: string, favorite: Omit<Favorite, "save_time">): Promise<{ success: boolean }> {
    const response = await this._fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, favorite }),
    });
    return response.json();
  }

  async deleteFavorite(key?: string): Promise<{ success: boolean }> {
    const url = key ? `/api/favorites?key=${encodeURIComponent(key)}` : "/api/favorites";
    const response = await this._fetch(url, { method: "DELETE" });
    return response.json();
  }

  async getPlayRecords(): Promise<Record<string, PlayRecord>> {
    const response = await this._fetch("/api/playrecords");
    return response.json();
  }

  async savePlayRecord(key: string, record: Omit<PlayRecord, "save_time">): Promise<{ success: boolean }> {
    const response = await this._fetch("/api/playrecords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, record }),
    });
    return response.json();
  }

  async deletePlayRecord(key?: string): Promise<{ success: boolean }> {
    const url = key ? `/api/playrecords?key=${encodeURIComponent(key)}` : "/api/playrecords";
    const response = await this._fetch(url, { method: "DELETE" });
    return response.json();
  }

  async getSearchHistory(): Promise<string[]> {
    const response = await this._fetch("/api/searchhistory");
    return response.json();
  }

  async addSearchHistory(keyword: string): Promise<string[]> {
    const response = await this._fetch("/api/searchhistory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword }),
    });
    return response.json();
  }

  async deleteSearchHistory(keyword?: string): Promise<{ success: boolean }> {
    const url = keyword ? `/api/searchhistory?keyword=${keyword}` : "/api/searchhistory";
    const response = await this._fetch(url, { method: "DELETE" });
    return response.json();
  }

  getImageProxyUrl(imageUrl: string): string {
    return `${this.baseURL}/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
  }

  async getDoubanData(
    type: "movie" | "tv",
    tag: string,
    pageSize: number = 16,
    pageStart: number = 0
  ): Promise<DoubanResponse> {
    const url = `/api/douban?type=${type}&tag=${encodeURIComponent(tag)}&pageSize=${pageSize}&pageStart=${pageStart}`;
    const response = await this._fetch(url);
    return response.json();
  }

  async searchVideos(query: string): Promise<{ results: SearchResult[] }> {
    const url = `/api/search?q=${encodeURIComponent(query)}`;
    const response = await this._fetch(url);
    return response.json();
  }

  async searchVideo(query: string, resourceId: string, signal?: AbortSignal): Promise<{ results: SearchResult[] }> {
    const url = `/api/search/one?q=${encodeURIComponent(query)}&resourceId=${encodeURIComponent(resourceId)}`;
    const response = await this._fetch(url, { signal });
    const { results } = await response.json();
    return { results: results.filter((item: any) => item.title === query) };
  }

  async getResources(signal?: AbortSignal): Promise<ApiSite[]> {
    const url = `/api/search/resources`;
    const response = await this._fetch(url, { signal });
    return response.json();
  }

  async getVideoDetail(source: string, id: string): Promise<VideoDetail> {
    const url = `/api/detail?source=${source}&id=${id}`;
    const response = await this._fetch(url);
    return response.json();
  }

  /**
   * 校验当前会话是否有效（PR #278）。
   * 用于启动时判断是否需要重新登录：拿收藏接口试一次，401 即失效。
   */
  async validateSession(): Promise<boolean> {
    try {
      await this.getFavorites();
      return true;
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        return false;
      }
      throw error;
    }
  }
}

// 默认实例
export let api = new API();
