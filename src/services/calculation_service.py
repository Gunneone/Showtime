from collections import defaultdict
from datetime import datetime

class CalculationService:
    """Service for calculating watch time statistics."""
    
    def calculate_show_time(self, show):
        """Calculate total watch time for a single show."""
        # Check if we have a pre-calculated precise runtime (new approach)
        if 'calculated_runtime_minutes' in show:
            return int(show['calculated_runtime_minutes'])
        
        # Check if we have per-episode runtime data (test/legacy approach)
        episode_runtimes = show.get('episode_runtimes', {})
        if episode_runtimes:
            total_time = 0
            seasons_watched = show.get('seasons_watched', 0)
            default_runtime = show.get('episode_run_time', 45)
            
            for season_num in range(1, seasons_watched + 1):
                season_key = str(season_num)
                if season_key in episode_runtimes:
                    # Use precise episode runtimes for this season
                    season_runtimes = episode_runtimes[season_key]
                    for runtime in season_runtimes:
                        if runtime is not None:
                            total_time += runtime
                        else:
                            total_time += default_runtime  # Fallback for missing episode data
                else:
                    # Fall back to average calculation for seasons without precise data
                    total_episodes_in_show = show.get('total_episodes', 0)
                    total_seasons_in_show = show.get('total_seasons', 1)
                    
                    if total_episodes_in_show > 0 and total_seasons_in_show > 0:
                        episodes_per_season = total_episodes_in_show / total_seasons_in_show
                    else:
                        episodes_per_season = 20  # Default assumption
                    
                    total_time += int(episodes_per_season * default_runtime)
            
            return int(total_time)
        
        # Legacy calculation for existing shows without pre-calculated runtime or episode runtimes
        seasons_watched = show.get('seasons_watched', 0)
        episode_run_time = show.get('episode_run_time', 45)  # Default 45 minutes
        
        # Use actual episode counts from TMDB when available
        total_episodes_in_show = show.get('total_episodes', 0)
        total_seasons_in_show = show.get('total_seasons', 1)
        
        if total_episodes_in_show > 0 and total_seasons_in_show > 0:
            # Calculate actual episodes per season from TMDB data
            episodes_per_season = total_episodes_in_show / total_seasons_in_show
        else:
            # Fallback to assumption of 20 episodes per season for shows without episode count data
            episodes_per_season = 20
        
        total_episodes = seasons_watched * episodes_per_season
        total_time_minutes = total_episodes * episode_run_time
        
        return int(total_time_minutes)
    
    def calculate_total_time(self, watched_shows):
        """Calculate total watch time across all shows."""
        total_minutes = 0
        
        for show in watched_shows:
            total_minutes += self.calculate_show_time(show)
        
        return total_minutes
    
    def format_time(self, minutes):
        """Format time in minutes to a human-readable string."""
        if minutes == 0:
            return "0h"
        
        hours = minutes // 60
        remaining_minutes = minutes % 60
        
        if hours == 0:
            return f"{remaining_minutes} minute{'s' if remaining_minutes != 1 else ''}"
        
        if hours < 24:
            if remaining_minutes > 0:
                return f"{hours}h {remaining_minutes}m"
            return f"{hours}h"
        
        days = hours // 24
        remaining_hours = hours % 24
        
        if days < 365:
            # Always display hours, even when 0h
            return f"{days}d {remaining_hours}h"
        
        years = days // 365
        remaining_days = days % 365
        
        if remaining_days > 0:
            return f"{years}y {remaining_days}d"
        return f"{years}y"
    
    def calculate_fun_conversions(self, total_minutes):
        """Calculate fun time conversions ordered by size (smallest to largest time periods)."""
        conversions = []
        
        # Order by size: Hyperbullet Chess (1min) -> Teen Spirit (5min) -> 30-min walk -> Flight (150min) -> LotR Extended (715min) -> Harry Potter (73h) -> Trans-Siberian (7 days) -> Learn Language (675h) -> Pregnancy (9 months)
        
        # 1. Play a round of hyperbullet chess (1 minute)
        chess_times = total_minutes / 1
        value = self._format_conversion_number(chess_times)
        conversions.append({
            'icon': 'fas fa-chess-pawn',
            'value': value,
            'description': 'played a round of hyperbullet chess',
            'times_text': 'times' if float(value.replace(',', '')) != 1 else 'time'
        })
        
        # 2. Smells Like Teen Spirit (5 minutes 1 second ≈ 5.02 minutes)
        teen_spirit_times = total_minutes / 5.02
        value = self._format_conversion_number(teen_spirit_times)
        conversions.append({
            'icon': 'fas fa-music',
            'value': value,
            'description': 'listened to "Smells Like Teen Spirit"',
            'times_text': 'times' if float(value.replace(',', '')) != 1 else 'time'
        })
        
        # 3. 30-minute walk
        walk_times = total_minutes / 30
        value = self._format_conversion_number(walk_times)
        conversions.append({
            'icon': 'fas fa-walking',
            'value': value,
            'description': 'taken a 30-minute walk',
            'times_text': 'times' if float(value.replace(',', '')) != 1 else 'time'
        })
        
        # 4. Flight between NY and Chicago (2h 30m = 150 minutes)
        flight_times = total_minutes / 150
        value = self._format_conversion_number(flight_times)
        conversions.append({
            'icon': 'fas fa-plane',
            'value': value,
            'description': 'taken a flight between NY and Chicago',
            'times_text': 'times' if float(value.replace(',', '')) != 1 else 'time'
        })
        
        # 5. Watched extended LotR Trilogy (715 minutes)
        lotr_times = total_minutes / 715
        value = self._format_conversion_number(lotr_times)
        conversions.append({
            'icon': 'fas fa-ring',
            'value': value,
            'description': 'watched extended LotR trilogy',
            'times_text': 'times' if float(value.replace(',', '')) != 1 else 'time'
        })
        
        # 6. Reading Harry Potter series (about 73 hours ≈ 4,380 minutes)
        hp_times = total_minutes / 4380
        value = self._format_conversion_number(hp_times)
        conversions.append({
            'icon': 'fas fa-book',
            'value': value,
            'description': 'read the entire Harry Potter series',
            'times_text': 'times' if float(value.replace(',', '')) != 1 else 'time'
        })
        
        # 7. Trans-Siberian Railway trip (about 7 days ≈ 10,080 minutes)
        trans_siberian_times = total_minutes / 10080
        value = self._format_conversion_number(trans_siberian_times)
        conversions.append({
            'icon': 'fas fa-train',
            'value': value,
            'description': 'completed trips on the Trans-Siberian Railway',
            'times_text': 'times' if float(value.replace(',', '')) != 1 else 'time'
        })
        
        # 8. Learn a Language (675 hours = 40,500 minutes)
        language_times = total_minutes / 40500
        value = self._format_conversion_number(language_times)
        conversions.append({
            'icon': 'fas fa-language',
            'value': value,
            'description': 'learned a language',
            'times_text': 'times' if float(value.replace(',', '')) != 1 else 'time'
        })
        
        # 9. Carried out a baby (9 months = 270 days = 388,800 minutes)
        pregnancy_times = total_minutes / 388800
        value = self._format_conversion_number(pregnancy_times)
        conversions.append({
            'icon': 'fas fa-baby',
            'value': value,
            'description': 'carried out a baby',
            'times_text': 'times' if float(value.replace(',', '')) != 1 else 'time'
        })
        
        return conversions
    
    def _format_conversion_number(self, number):
        """Format conversion number with decimal places only if less than two digits before comma."""
        if number >= 10:
            # Two or more digits before decimal point - show as integer
            return f"{number:,.0f}"
        else:
            # Less than two digits before decimal point - show one decimal place
            return f"{number:.1f}"
    
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
                'total_episodes': 0,
                'total_time_minutes': 0,
                'total_time_formatted': '0h',
                'average_time_per_show': 0,
                'genre_breakdown': {},
                'network_breakdown': {},
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
        
        # Calculate total episodes
        total_episodes = 0
        for show in watched_shows:
            seasons_watched = show.get('seasons_watched', 0)
            total_episodes_in_show = show.get('total_episodes', 0)
            total_seasons_in_show = show.get('total_seasons', 1)
            
            if total_episodes_in_show > 0 and total_seasons_in_show > 0:
                episodes_per_season = total_episodes_in_show / total_seasons_in_show
            else:
                episodes_per_season = 20  # Default assumption
            
            episodes_watched = seasons_watched * episodes_per_season
            total_episodes += round(episodes_watched)
        
        average_time_per_show = total_time_minutes // total_shows if total_shows > 0 else 0
        
        # Genre breakdown
        genre_breakdown = defaultdict(int)
        for show in watched_shows:
            for genre in show.get('genres', []):
                genre_name = genre.get('name', 'Unknown') if isinstance(genre, dict) else str(genre)
                show_time = self.calculate_show_time(show)
                genre_breakdown[genre_name] += show_time
        
        # Network breakdown
        network_breakdown = defaultdict(int)
        for show in watched_shows:
            for network in show.get('networks', []):
                network_name = network.get('name', 'Unknown') if isinstance(network, dict) else str(network)
                show_time = self.calculate_show_time(show)
                network_breakdown[network_name] += show_time
        
        # Yearly breakdown (based on stored season details - no API calls needed)
        yearly_breakdown = defaultdict(int)
        for show in watched_shows:
            # Check if we have detailed season information stored
            season_details = show.get('season_details', [])
            
            if season_details:
                # Use stored per-season data (precise runtime and air date)
                for season_detail in season_details:
                    season_runtime = season_detail.get('runtime_minutes', 0)
                    season_air_date = season_detail.get('air_date', '')
                    
                    if season_air_date:
                        try:
                            year = datetime.strptime(season_air_date, '%Y-%m-%d').year
                            yearly_breakdown[str(year)] += season_runtime
                        except ValueError:
                            # If air date is invalid, use 'Unknown'
                            yearly_breakdown['Unknown'] += season_runtime
                    else:
                        yearly_breakdown['Unknown'] += season_runtime
            else:
                # Fallback for shows without detailed season data (legacy shows)
                # Use show release year for the entire show time
                first_air_date = show.get('first_air_date', '')
                show_time = self.calculate_show_time(show)
                
                if first_air_date:
                    try:
                        year = datetime.strptime(first_air_date, '%Y-%m-%d').year
                        yearly_breakdown[str(year)] += show_time
                    except ValueError:
                        yearly_breakdown['Unknown'] += show_time
                else:
                    yearly_breakdown['Unknown'] += show_time
        
        # Completion statistics
        completed_shows = 0
        in_progress_shows = 0
        
        for show in watched_shows:
            seasons_watched = show.get('seasons_watched', 0)
            # Use released seasons count for completion calculation
            # Fall back to total_seasons for older shows that don't have released_seasons data
            show_released_seasons = show.get('released_seasons', show.get('total_seasons', 1))
            
            if seasons_watched >= show_released_seasons:
                completed_shows += 1
            else:
                in_progress_shows += 1
        
        completion_rate = (completed_shows / total_shows * 100) if total_shows > 0 else 0
        
        return {
            'total_shows': total_shows,
            'total_seasons': total_seasons,
            'total_episodes': total_episodes,
            'total_time_minutes': total_time_minutes,
            'total_time_formatted': self.format_time(total_time_minutes),
            'average_time_per_show': average_time_per_show,
            'average_time_per_show_formatted': self.format_time(average_time_per_show),
            'genre_breakdown': dict(genre_breakdown),
            'network_breakdown': dict(network_breakdown),
            'yearly_breakdown': dict(yearly_breakdown),
            'completion_stats': {
                'completed_shows': completed_shows,
                'in_progress_shows': in_progress_shows,
                'completion_rate': round(completion_rate, 1)
            },
            'fun_conversions': self.calculate_fun_conversions(total_time_minutes),
            'show_length_distribution': self.get_show_length_distribution(watched_shows)
        }