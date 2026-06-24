import { useState, useEffect } from "react";
import { ThemedCard, ThemedCardContent } from "@/components/ui/themed-card";
import { Sun, Cloud, CloudRain, CloudSnow, Zap, Coffee, Heart, Star } from "lucide-react";
import { useAuth } from "@/context/auth-context";

interface WelcomeBannerProps {
  className?: string;
}

interface WeatherData {
  condition: string;
  temperature: number;
  icon: any;
}

const getWeatherIcon = (condition: string) => {
  switch (condition.toLowerCase()) {
    case 'clear':
    case 'sunny':
      return Sun;
    case 'clouds':
    case 'cloudy':
    case 'partly cloudy':
      return Cloud;
    case 'rain':
    case 'rainy':
    case 'drizzle':
    case 'shower rain':
      return CloudRain;
    case 'snow':
    case 'snowy':
      return CloudSnow;
    case 'thunderstorm':
    case 'stormy':
    case 'thunder':
      return Zap;
    case 'mist':
    case 'smoke':
    case 'haze':
    case 'dust':
    case 'fog':
    case 'sand':
    case 'ash':
    case 'squall':
    case 'tornado':
      return Cloud;
    default:
      return Sun;
  }
};

const getGreeting = (hour: number, firstName: string) => {
  if (hour < 12) return `Good morning, ${firstName}! ☀️`;
  if (hour < 17) return `Good afternoon, ${firstName}! 🌟`;
  if (hour < 21) return `Good evening, ${firstName}! 🌙`;
  return `Good night, ${firstName}! ✨`;
};

const getMotivationalMessage = (role: string) => {
  const messages = {
    admin: [
      "Leading with excellence today! 🚀",
      "Making healthcare better, one decision at a time! 💪",
      "Your leadership inspires the team! 👑"
    ],
    practitioner: [
      "Ready to care for patients today! 🏥",
      "Making a difference in lives! ❤️",
      "Your expertise saves lives! 🩺"
    ],
    staff: [
      "Keeping everything running smoothly! ⚡",
      "You're the backbone of our healthcare! 💪",
      "Making patients feel welcome! 🤗"
    ],
    patient: [
      "Your health journey matters! 🌱",
      "Taking care of yourself is important! 💚",
      "You're in good hands today! 🤝"
    ]
  };
  
  const roleMessages = messages[role as keyof typeof messages] || messages.patient;
  return roleMessages[Math.floor(Math.random() * roleMessages.length)];
};

export function WelcomeBanner({ className }: WelcomeBannerProps) {
  const { user } = useAuth();
  const [weather, setWeather] = useState<WeatherData>({
    condition: 'sunny',
    temperature: 22,
    icon: Sun
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Generate realistic weather data based on location and season
    const generateRealisticWeather = () => {
      const now = new Date();
      const month = now.getMonth(); // 0-11
      const hour = now.getHours();
      
      // Get user's location for more accurate temperature
      let latitude = 40.7128; // Default: New York City
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            latitude = position.coords.latitude;
            setWeatherBasedOnLocation(latitude, month, hour);
          },
          (error) => {
            console.log('Geolocation error:', error);
            setWeatherBasedOnLocation(latitude, month, hour);
          }
        );
      } else {
        setWeatherBasedOnLocation(latitude, month, hour);
      }
    };

    const setWeatherBasedOnLocation = (lat: number, month: number, hour: number) => {
      // Determine season and base temperature
      let baseTemp = 22; // Default
      let conditions = ['sunny', 'cloudy', 'partly cloudy'];
      
      // Adjust temperature based on latitude and season
      if (lat > 50) { // Northern regions
        if (month >= 11 || month <= 2) { // Winter
          baseTemp = Math.floor(Math.random() * 15) - 5; // -5 to 10°C
          conditions = ['cloudy', 'snowy', 'partly cloudy'];
        } else if (month >= 3 && month <= 5) { // Spring
          baseTemp = Math.floor(Math.random() * 15) + 8; // 8-23°C
          conditions = ['sunny', 'cloudy', 'rainy', 'partly cloudy'];
        } else if (month >= 6 && month <= 8) { // Summer
          baseTemp = Math.floor(Math.random() * 15) + 18; // 18-33°C
          conditions = ['sunny', 'partly cloudy', 'cloudy'];
        } else { // Fall
          baseTemp = Math.floor(Math.random() * 15) + 10; // 10-25°C
          conditions = ['cloudy', 'rainy', 'partly cloudy'];
        }
      } else if (lat > 30) { // Temperate regions
        if (month >= 11 || month <= 2) { // Winter
          baseTemp = Math.floor(Math.random() * 20) + 5; // 5-25°C
          conditions = ['cloudy', 'rainy', 'partly cloudy'];
        } else if (month >= 3 && month <= 5) { // Spring
          baseTemp = Math.floor(Math.random() * 15) + 15; // 15-30°C
          conditions = ['sunny', 'cloudy', 'rainy', 'partly cloudy'];
        } else if (month >= 6 && month <= 8) { // Summer
          baseTemp = Math.floor(Math.random() * 15) + 25; // 25-40°C
          conditions = ['sunny', 'partly cloudy', 'cloudy'];
        } else { // Fall
          baseTemp = Math.floor(Math.random() * 15) + 15; // 15-30°C
          conditions = ['cloudy', 'rainy', 'partly cloudy'];
        }
      } else { // Tropical regions
        baseTemp = Math.floor(Math.random() * 15) + 25; // 25-40°C
        conditions = ['sunny', 'cloudy', 'rainy', 'partly cloudy'];
      }
      
      // Adjust for time of day
      if (hour >= 22 || hour <= 6) { // Night
        baseTemp -= 5;
      } else if (hour >= 12 && hour <= 16) { // Afternoon
        baseTemp += 3;
      }
      
      // Add some randomness
      baseTemp += Math.floor(Math.random() * 7) - 3; // ±3°C variation
      
      // Ensure reasonable bounds
      baseTemp = Math.max(-10, Math.min(45, baseTemp));
      
      const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
      
      setWeather({
        condition: randomCondition,
        temperature: Math.round(baseTemp),
        icon: getWeatherIcon(randomCondition)
      });
    };

    generateRealisticWeather();
  }, []);

  const handleCardClick = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1000);
  };

  const WeatherIcon = weather.icon;
  const greeting = getGreeting(currentTime.getHours(), user?.firstName || 'there');
  const motivationalMessage = getMotivationalMessage(user?.role || 'patient');

  return (
    <ThemedCard 
      className={`cursor-pointer transform transition-all duration-500 hover:scale-105 ${className} ${
        isAnimating ? 'animate-pulse' : ''
      }`}
      onClick={handleCardClick}
    >
      <ThemedCardContent className="p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className="flex items-center space-x-2">
                <Coffee className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-medium opacity-70">
                  {currentTime.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <WeatherIcon className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium opacity-70">
                  {weather.temperature}°C
                </span>
              </div>
            </div>
            
            <h1 className="text-2xl lg:text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {greeting}
            </h1>
            
            <p className="text-lg opacity-80 mb-4">
              {motivationalMessage}
            </p>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Heart className="w-4 h-4 text-red-500 animate-pulse" />
                <span className="text-sm opacity-70">Ready to serve</span>
              </div>
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="text-sm opacity-70">Excellence</span>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:block">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {user?.firstName?.charAt(0) || 'U'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </ThemedCardContent>
    </ThemedCard>
  );
}
