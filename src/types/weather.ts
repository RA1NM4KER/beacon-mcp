export type WeatherApiResponse = {
  location: {
    name: string;
    region: string;
    country: string;
  };
  current: {
    temp_c: number;
    feelslike_c: number;
    humidity: number;
    wind_kph: number;
    is_day: number;
    condition: {
      text: string;
    };
  };
  forecast: {
    forecastday: Array<{
      date: string;
      day: {
        maxtemp_c: number;
        mintemp_c: number;
        avgtemp_c: number;
        daily_chance_of_rain?: number;
        condition: {
          text: string;
        };
      };
      astro?: {
        sunrise?: string;
        sunset?: string;
      };
      hour?: Array<{
        time: string;
        temp_c: number;
        feelslike_c: number;
        chance_of_rain?: number;
        humidity: number;
        wind_kph: number;
        condition: {
          text: string;
        };
      }>;
    }>;
  };
};

export type FetchWeatherOptions = {
  location?: string;
  date?: string;
  days?: number;
  hour?: number;
};
