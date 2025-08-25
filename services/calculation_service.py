from collections import defaultdict
from datetime import datetime

class CalculationService:
    """Service for calculating watch time statistics."""
    
    def calculate_show_time(self, show):
        """Calculate total watch time for a single show."""
        seasons_watched = show.get('seasons_watched', 0)
        episode_run_time = show.get('episode_run_time', 45)  # Default 45 minutes
        
        # For simplicity, assume average of 20 episodes per season
        # In a real implementation, we would fetch actual episode counts from TMDB
        episodes_per_season = 20
        
        total_episodes = seasons_watched * episodes_per_season
        total_time_minutes = total_episodes * episode_run_time
        
        return total_time_minutes
    
    def calculate_total_time(self, watched_shows):
        """Calculate total watch time across all shows."""
        total_minutes = 0
        
        for show in watched_shows:
            total_minutes += self.calculate_show_time(show)
        
        return total_minutes
    
    def format_time(self, minutes):
        """Format time in minutes to a human-readable string."""
        hours = minutes // 60
        remaining_minutes = minutes % 60
        
        if hours < 24:
            if remaining_minutes > 0:
                return f"{hours}h {remaining_minutes}m"
            return f"{hours}h"
        
        days = hours // 24
        remaining_hours = hours % 24
        
        if days < 365:
            if remaining_hours > 0:
                return f"{days}d {remaining_hours}h"
            return f"{days}d"
        
        years = days // 365
        remaining_days = days % 365
        
        if remaining_days > 0:
            return f"{years}y {remaining_days}d"
        return f"{years}y"
    
    def calculate_fun_conversions(self, total_minutes):
        """Calculate fun time conversions ordered by size (smallest to largest time periods)."""
        conversions = []
        
        # Order by size: Teen Spirit (5min) -> NYC-LA flights (6h) -> Sleep (8h) -> LotR (11.5h) -> Harry Potter (73h) -> Trans-Siberian (7 days)
        
        # 1. Smells Like Teen Spirit (5 minutes 1 second ≈ 5.02 minutes)
        teen_spirit_times = total_minutes / 5.02
        conversions.append({
            'icon': 'fas fa-music',
            'value': f"{teen_spirit_times:.0f}",
            'description': 'listened to "Smells Like Teen Spirit" 🎵'
        })
        
        # 2. NYC to LA flights (about 6 hours ≈ 360 minutes)
        nyc_la_flights = total_minutes / 360
        conversions.append({
            'icon': 'fas fa-plane',
            'value': f"{nyc_la_flights:.1f}",
            'description': 'flown between New York and Los Angeles ✈️'
        })
        
        # 3. Full night's sleep (8 hours = 480 minutes)
        sleep_nights = total_minutes / 480
        conversions.append({
            'icon': 'fas fa-bed',
            'value': f"{sleep_nights:.0f}",
            'description': 'gotten full nights of sleep 😴'
        })
        
        # 4. Extended Lord of the Rings trilogy (11 hours 26 minutes ≈ 686 minutes)
        lotr_times = total_minutes / 686
        conversions.append({
            'icon': 'fas fa-ring',
            'value': f"{lotr_times:.1f}",
            'description': 'watched the extended Lord of the Rings trilogy 💍'
        })
        
        # 5. Reading Harry Potter series (about 73 hours ≈ 4,380 minutes)
        hp_times = total_minutes / 4380
        conversions.append({
            'icon': 'fas fa-book',
            'value': f"{hp_times:.1f}",
            'description': 'read the entire Harry Potter series 📚'
        })
        
        # 6. Trans-Siberian Railway end-to-end trip (about 7 days ≈ 10,080 minutes)
        trans_siberian_times = total_minutes / 10080
        conversions.append({
            'icon': 'fas fa-train',
            'value': f"{trans_siberian_times:.2f}",
            'description': 'completed end-to-end trips on the Trans-Siberian Railway 🚂'
        })
        
        return conversions
    
    def get_show_length_distribution(self, watched_shows):
        """Get distribution of show lengths for chart."""
        length_ranges = {
            'Short (< 30min)': 0,
            'Standard (30-60min)': 0,
            'Long (60-90min)': 0,
            'Very Long (> 90min)': 0
        }
        
        for show in watched_shows:
            runtime = show.get('episode_run_time', 45)
            show_time = self.calculate_show_time(show)
            
            if runtime < 30:
                length_ranges['Short (< 30min)'] += show_time
            elif runtime <= 60:
                length_ranges['Standard (30-60min)'] += show_time
            elif runtime <= 90:
                length_ranges['Long (60-90min)'] += show_time
            else:
                length_ranges['Very Long (> 90min)'] += show_time
        
        return length_ranges
    
    def calculate_stats(self, watched_shows):
        """Calculate comprehensive viewing statistics."""
        if not watched_shows:
            return {
                'total_shows': 0,
                'total_seasons': 0,
                'total_time_minutes': 0,
                'total_time_formatted': '0h',
                'average_time_per_show': 0,
                'genre_breakdown': {},
                'yearly_breakdown': {},
                'completion_stats': {
                    'completed_shows': 0,
                    'in_progress_shows': 0,
                    'completion_rate': 0
                },
                'fun_conversions': [],
                'show_length_distribution': {}
            }
        
        total_shows = len(watched_shows)
        total_seasons = sum(show.get('seasons_watched', 0) for show in watched_shows)
        total_time_minutes = self.calculate_total_time(watched_shows)
        average_time_per_show = total_time_minutes // total_shows if total_shows > 0 else 0
        
        # Genre breakdown
        genre_breakdown = defaultdict(int)
        for show in watched_shows:
            for genre in show.get('genres', []):
                genre_name = genre.get('name', 'Unknown') if isinstance(genre, dict) else str(genre)
                show_time = self.calculate_show_time(show)
                genre_breakdown[genre_name] += show_time
        
        # Yearly breakdown (based on first air date)
        yearly_breakdown = defaultdict(int)
        for show in watched_shows:
            first_air_date = show.get('first_air_date', '')
            if first_air_date:
                try:
                    year = datetime.strptime(first_air_date, '%Y-%m-%d').year
                    show_time = self.calculate_show_time(show)
                    yearly_breakdown[str(year)] += show_time
                except ValueError:
                    # Handle invalid date formats
                    yearly_breakdown['Unknown'] += self.calculate_show_time(show)
            else:
                yearly_breakdown['Unknown'] += self.calculate_show_time(show)
        
        # Completion statistics
        completed_shows = 0
        in_progress_shows = 0
        
        for show in watched_shows:
            seasons_watched = show.get('seasons_watched', 0)
            show_total_seasons = show.get('total_seasons', 1)
            
            if seasons_watched >= show_total_seasons:
                completed_shows += 1
            else:
                in_progress_shows += 1
        
        completion_rate = (completed_shows / total_shows * 100) if total_shows > 0 else 0
        
        return {
            'total_shows': total_shows,
            'total_seasons': total_seasons,
            'total_time_minutes': total_time_minutes,
            'total_time_formatted': self.format_time(total_time_minutes),
            'average_time_per_show': average_time_per_show,
            'average_time_per_show_formatted': self.format_time(average_time_per_show),
            'genre_breakdown': dict(genre_breakdown),
            'yearly_breakdown': dict(yearly_breakdown),
            'completion_stats': {
                'completed_shows': completed_shows,
                'in_progress_shows': in_progress_shows,
                'completion_rate': round(completion_rate, 1)
            },
            'fun_conversions': self.calculate_fun_conversions(total_time_minutes),
            'show_length_distribution': self.get_show_length_distribution(watched_shows)
        }