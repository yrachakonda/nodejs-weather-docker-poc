export function WeatherIcon({ condition, className = 'weather-illustration' }: { condition: string; className?: string }) {
  if (condition === 'Sunny') {
    return (
      <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
        <circle className="weather-illustration__sun-core" cx="60" cy="60" r="21" />
        <g className="weather-illustration__rays">
          <path d="M60 18V30" />
          <path d="M60 90V102" />
          <path d="M18 60H30" />
          <path d="M90 60H102" />
          <path d="M30.3 30.3L38.8 38.8" />
          <path d="M81.2 81.2L89.7 89.7" />
          <path d="M30.3 89.7L38.8 81.2" />
          <path d="M81.2 38.8L89.7 30.3" />
        </g>
      </svg>
    );
  }

  if (condition === 'Rain') {
    return (
      <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
        <g className="weather-illustration__cloud">
          <circle cx="46" cy="52" r="16" />
          <circle cx="65" cy="47" r="19" />
          <circle cx="81" cy="55" r="14" />
          <rect x="31" y="55" width="63" height="22" rx="11" />
        </g>
        <g className="weather-illustration__rain">
          <path d="M43 84L37 96" />
          <path d="M60 84L54 96" />
          <path d="M77 84L71 96" />
        </g>
      </svg>
    );
  }

  if (condition === 'Snow') {
    return (
      <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
        <g className="weather-illustration__cloud">
          <circle cx="46" cy="52" r="16" />
          <circle cx="65" cy="47" r="19" />
          <circle cx="81" cy="55" r="14" />
          <rect x="31" y="55" width="63" height="22" rx="11" />
        </g>
        <g className="weather-illustration__snow">
          <path d="M44 84v14" />
          <path d="M37 91h14" />
          <path d="M39 86l10 10" />
          <path d="M49 86L39 96" />
          <path d="M69 84v14" />
          <path d="M62 91h14" />
          <path d="M64 86l10 10" />
          <path d="M74 86L64 96" />
        </g>
      </svg>
    );
  }

  if (condition === 'Windy') {
    return (
      <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
        <g className="weather-illustration__wind">
          <path d="M20 46H78c9 0 14-5 14-11 0-7-5-11-11-11-5 0-9 3-10 8" />
          <path d="M20 63H92c8 0 12 5 12 10 0 6-4 10-10 10-5 0-8-2-10-6" />
          <path d="M20 80H67c8 0 12 4 12 9 0 5-4 9-9 9-4 0-7-2-8-5" />
        </g>
      </svg>
    );
  }

  if (condition === 'Fog') {
    return (
      <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
        <g className="weather-illustration__cloud">
          <circle cx="46" cy="48" r="16" />
          <circle cx="65" cy="43" r="19" />
          <circle cx="81" cy="51" r="14" />
          <rect x="31" y="51" width="63" height="22" rx="11" />
        </g>
        <g className="weather-illustration__fog">
          <path d="M28 84H92" />
          <path d="M36 92H84" />
          <path d="M24 100H88" />
        </g>
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <circle className="weather-illustration__sun-core weather-illustration__sun-core--small" cx="40" cy="42" r="15" />
      <g className="weather-illustration__cloud">
        <circle cx="50" cy="58" r="16" />
        <circle cx="69" cy="53" r="19" />
        <circle cx="85" cy="61" r="14" />
        <rect x="35" y="61" width="63" height="22" rx="11" />
      </g>
    </svg>
  );
}
