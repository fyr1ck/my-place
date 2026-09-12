// Widget de tempo. Dados da Open-Meteo (gratuita, sem chave de API) e nome da cidade
// pela BigDataCloud. Localizacao vem do navegador, com cidade padrao se negar.
(function (MP) {
  const CACHE = 'mp.weather'; // ultimo resultado, para nao abrir vazio
  const PLACE = 'mp.weatherPlace'; // ultima coordenada aceita
  const REFRESH_MS = 15 * 60 * 1000;
  const STALE_MS = 15 * 60 * 1000;

  // usada quando a geolocalizacao e negada ou falha
  const FALLBACK = { lat: -23.5505, lon: -46.6333, city: 'Sao Paulo' };

  const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
  const GEO_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

  // ---------- codigos WMO -> texto, grupo e icone ----------

  const SUN = '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6"/>';
  const MOON = '<path d="M20 14.4A8.4 8.4 0 0 1 9.6 4a8.4 8.4 0 1 0 10.4 10.4Z"/>';
  const CLOUD = '<path d="M7.5 18.5h9.2a3.8 3.8 0 0 0 .4-7.6 5.6 5.6 0 0 0-10.8-1.2 3.9 3.9 0 0 0 1.2 8.8Z"/>';
  const SUN_CLOUD = '<circle cx="8.4" cy="8.4" r="3"/><path d="M8.4 2.8v1.5M2.8 8.4h1.5M4.5 4.5l1 1M12.2 4.5l-1 1"/>' +
    '<path d="M10.5 19.5h7.2a3.2 3.2 0 0 0 .3-6.4 4.8 4.8 0 0 0-9.2-1 3.3 3.3 0 0 0 1.7 7.4Z"/>';
  const FOG = CLOUD + '<path d="M5 21h5M13 21h6"/>';
  const DRIZZLE = CLOUD + '<path d="M9.5 20.8v1.4M14.5 20.8v1.4"/>';
  const RAIN = CLOUD + '<path d="M9 20.4l-.8 2M12.5 20.4l-.8 2M16 20.4l-.8 2"/>';
  const SNOW = CLOUD + '<path d="M9.2 21.4h.01M12.5 22.2h.01M15.8 21.4h.01"/>';
  const THUNDER = CLOUD + '<path d="M13.2 19.6 10.6 23h3l-.8 2.2"/><path d="m13.4 19.8-2.4 3.1h2.6l-.7 1.9"/>';

  const CONDITIONS = {
    0: { text: 'Ceu limpo', group: 'clear' },
    1: { text: 'Quase limpo', group: 'clear' },
    2: { text: 'Parcialmente nublado', group: 'partly' },
    3: { text: 'Nublado', group: 'cloud' },
    45: { text: 'Neblina', group: 'fog' },
    48: { text: 'Neblina com gelo', group: 'fog' },
    51: { text: 'Garoa leve', group: 'drizzle' },
    53: { text: 'Garoa', group: 'drizzle' },
    55: { text: 'Garoa forte', group: 'drizzle' },
    56: { text: 'Garoa congelante', group: 'drizzle' },
    57: { text: 'Garoa congelante', group: 'drizzle' },
    61: { text: 'Chuva leve', group: 'rain' },
    63: { text: 'Chuva', group: 'rain' },
    65: { text: 'Chuva forte', group: 'rain' },
    66: { text: 'Chuva congelante', group: 'rain' },
    67: { text: 'Chuva congelante', group: 'rain' },
    71: { text: 'Neve leve', group: 'snow' },
    73: { text: 'Neve', group: 'snow' },
    75: { text: 'Neve forte', group: 'snow' },
    77: { text: 'Granizo fino', group: 'snow' },
    80: { text: 'Pancadas de chuva', group: 'rain' },
    81: { text: 'Pancadas de chuva', group: 'rain' },
    82: { text: 'Pancadas fortes', group: 'rain' },
    85: { text: 'Pancadas de neve', group: 'snow' },
    86: { text: 'Pancadas de neve', group: 'snow' },
    95: { text: 'Tempestade', group: 'thunder' },
    96: { text: 'Tempestade com granizo', group: 'thunder' },
    99: { text: 'Tempestade com granizo', group: 'thunder' }
  };

  const SHAPES = {
    clear: SUN,
    night: MOON,
    partly: SUN_CLOUD,
    cloud: CLOUD,
    fog: FOG,
    drizzle: DRIZZLE,
    rain: RAIN,
    snow: SNOW,
    thunder: THUNDER
  };

  function condition(code, isDay) {
    const found = CONDITIONS[code] || { text: 'Sem dados', group: 'cloud' };
    const group = found.group === 'clear' && isDay === 0 ? 'night' : found.group;
    return { text: found.text, group, shape: SHAPES[group] || CLOUD };
  }

  // ---------- rede ----------

  async function getJSON(url, ms = 9000) {
    const stop = new AbortController();
    const timer = setTimeout(() => stop.abort(), ms);

    try {
      const res = await fetch(url, { signal: stop.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function locate() {
    const saved = MP.read(PLACE, null);

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(saved || FALLBACK);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(saved || FALLBACK), // permissao negada ou falha
        { timeout: 8000, maximumAge: 30 * 60 * 1000 }
      );
    });
  }

  async function cityName(place) {
    if (place.city) return place.city;

    try {
      const data = await getJSON(
        `${GEO_URL}?latitude=${place.lat}&longitude=${place.lon}&localityLanguage=pt`, 7000
      );

      // no Brasil, "city" vem como regiao metropolitana; "locality" e a cidade mesmo
      const names = [data.locality, data.city, data.principalSubdivision]
        .filter((n) => n && n.trim());

      return names.find((n) => n.length <= 30) || names[0] || 'Sua regiao';
    } catch (_) {
      return 'Sua regiao';
    }
  }

  async function fetchWeather() {
    const place = await locate();

    const url = `${FORECAST_URL}?latitude=${place.lat.toFixed(4)}&longitude=${place.lon.toFixed(4)}` +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min' +
      '&timezone=auto&forecast_days=5';

    const [data, city] = await Promise.all([getJSON(url), cityName(place)]);
    const now = data.current || {};
    const daily = data.daily || {};

    const result = {
      city,
      temp: Math.round(now.temperature_2m),
      feels: Math.round(now.apparent_temperature),
      humidity: Math.round(now.relative_humidity_2m),
      code: now.weather_code,
      isDay: now.is_day,
      days: (daily.time || []).map((date, i) => ({
        date,
        code: daily.weather_code[i],
        max: Math.round(daily.temperature_2m_max[i]),
        min: Math.round(daily.temperature_2m_min[i])
      })),
      at: Date.now()
    };

    MP.write(PLACE, { lat: place.lat, lon: place.lon, city });
    MP.write(CACHE, result);
    return result;
  }

  // ---------- interface ----------

  function icon(shape, group, size) {
    return MP.h('i', {
      class: `wx__icon wx__icon--${size}`,
      dataset: { cond: group },
      svg: shape
    });
  }

  function skeleton() {
    return MP.h('div', { class: 'wx__loading' },
      MP.h('i', { class: 'wx__bar wx__bar--icon' }),
      MP.h('div', { class: 'wx__lines' },
        MP.h('i', { class: 'wx__bar wx__bar--lg' }),
        MP.h('i', { class: 'wx__bar wx__bar--sm' })
      )
    );
  }

  function errorState(onRetry) {
    return MP.h('div', { class: 'wx__error' },
      MP.h('p', { class: 'wx__error-text', text: 'Nao deu para carregar o tempo agora.' }),
      MP.h('button', {
        class: 'btn btn--plain btn--sm', type: 'button', text: 'Tentar de novo', onclick: onRetry
      })
    );
  }

  function body(data, stale) {
    const now = condition(data.code, data.isDay);
    const today = MP.today();

    return MP.h('div', {},
      MP.h('div', { class: 'wx__now' },
        icon(now.shape, now.group, 'lg'),
        MP.h('div', { class: 'wx__read' },
          MP.h('strong', { class: 'wx__temp' }, `${data.temp}°`),
          MP.h('p', { class: 'wx__cond', text: now.text }),
          MP.h('p', { class: 'wx__meta', text: `sensacao ${data.feels}° · umidade ${data.humidity}%` })
        )
      ),

      data.days.length
        ? MP.h('div', { class: 'wx__days' }, data.days.map((day) => {
            const c = condition(day.code, 1);
            const label = day.date === today
              ? 'hoje'
              : MP.WEEKDAYS[MP.weekIndex(MP.parseISO(day.date))].slice(0, 3).toLowerCase();

            return MP.h('div', { class: 'wx__day' },
              MP.h('span', { class: 'wx__day-name', text: label }),
              icon(c.shape, c.group, 'sm'),
              MP.h('span', { class: 'wx__day-temp' },
                MP.h('b', { text: `${day.max}°` }),
                MP.h('span', { text: `${day.min}°` })
              )
            );
          }))
        : null,

      stale ? MP.h('p', { class: 'wx__stale', text: 'sem conexao — mostrando o ultimo dado' }) : null
    );
  }

  // ---------- widget ----------

  let timer = null;
  let current = null;

  function tile() {
    const city = MP.h('span', { class: 'wx__city' },
      MP.h('i', { class: 'wx__pin', svg: '<path d="M12 21s6.2-5.3 6.2-10.2A6.2 6.2 0 0 0 5.8 10.8C5.8 15.7 12 21 12 21Z"/><circle cx="12" cy="10.6" r="2.1"/>' }),
      MP.h('span', { class: 'wx__city-name', text: '—' })
    );

    const slot = MP.h('div', { class: 'wx__slot' });

    const node = MP.h('section', { class: 'tile tile--wide wx' },
      MP.h('span', { class: 'tile__head' },
        MP.h('i', { class: 'tile__icon', svg: CLOUD }),
        'Tempo',
        city
      ),
      slot
    );

    function paint(data, stale) {
      city.querySelector('.wx__city-name').textContent = data.city;
      MP.clear(slot).append(body(data, stale));
    }

    async function load(showSkeleton) {
      const cached = MP.read(CACHE, null);

      if (cached && cached.days) paint(cached, false);
      else if (showSkeleton) MP.clear(slot).append(skeleton());

      try {
        paint(await fetchWeather(), false);
      } catch (err) {
        console.warn('tempo indisponivel', err);
        if (cached && cached.days) paint(cached, true);
        else MP.clear(slot).append(errorState(() => load(true)));
      }
    }

    load(true);

    clearInterval(timer);
    timer = setInterval(() => load(false), REFRESH_MS);

    // ao voltar para a aba, atualiza se o dado estiver velho
    node._onVisible = () => {
      if (document.hidden) return;
      const cached = MP.read(CACHE, null);
      if (!cached || Date.now() - cached.at > STALE_MS) load(false);
    };

    document.addEventListener('visibilitychange', node._onVisible);

    current = node;
    return node;
  }

  function stop() {
    clearInterval(timer);
    timer = null;

    if (current && current._onVisible) {
      document.removeEventListener('visibilitychange', current._onVisible);
      current = null;
    }
  }

  MP.weather = { tile, stop };
})(window.MP);
