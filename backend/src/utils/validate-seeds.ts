import weather from '../data/weather-reports.json';
import users from '../data/users.json';
import apiKeys from '../data/api-keys.json';

if (weather.length !== 100) throw new Error('weather reports must be 100');
if (!users.length) throw new Error('users seed cannot be empty');
if (!apiKeys.length) throw new Error('api keys seed cannot be empty');
console.log('seed validation passed');
