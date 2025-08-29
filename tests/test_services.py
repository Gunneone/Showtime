import pytest
from src.services.calculation_service import CalculationService
from src.services.tmdb_service import TMDBService

def test_calculation_service_init():
    """Test that CalculationService initializes correctly."""
    service = CalculationService()
    assert service is not None

def test_calculate_show_time():
    """Test calculating watch time for a single show."""
    service = CalculationService()
    
    # Test with hardcoded fallback (no episode count data)
    show_no_data = {
        'seasons_watched': 2,
        'episode_run_time': 45
    }
    
    # 2 seasons * 20 episodes/season * 45 minutes = 1800 minutes
    expected_time = 2 * 20 * 45
    actual_time = service.calculate_show_time(show_no_data)
    
    assert actual_time == expected_time

def test_tmdb_service_episode_runtimes():
    """Test TMDB service can fetch episode runtime data."""
    service = TMDBService()
    service.use_mock_data_for_testing()  # Enable mock data for testing
    
    # Test with mock data (show ID 1 = Breaking Bad, should have 2 seasons of mock data)
    episode_runtimes = service.get_show_episode_runtimes(1, 2)
    
    # Should return episode runtimes for seasons 1 and 2
    assert 1 in episode_runtimes
    assert 2 in episode_runtimes
    
    # Season 1 should have 7 episodes with specific runtimes
    season_1_runtimes = episode_runtimes[1]
    assert len(season_1_runtimes) == 7
    assert season_1_runtimes[0] == 58  # Pilot episode
    assert all(runtime == 48 for runtime in season_1_runtimes[1:])  # Other episodes
    
    # Season 2 should have 13 episodes
    season_2_runtimes = episode_runtimes[2]
    assert len(season_2_runtimes) == 13
    assert all(runtime == 47 for runtime in season_2_runtimes)  # All episodes 47 min

def test_precise_episode_calculation():
    """Test precise episode-by-episode runtime calculation."""
    service = CalculationService()
    
    # Test show with precise episode runtime data (like Breaking Bad season 1)
    # Season 1: 7 episodes with actual runtimes: [58, 48, 48, 48, 48, 48, 48]
    # Total: 346 minutes (5h 46m) - much more accurate than 5h 15m from averages
    show_with_precise_data = {
        'seasons_watched': 1,
        'episode_run_time': 47,  # Average runtime (fallback)
        'total_episodes': 62,
        'total_seasons': 5,
        'episode_runtimes': {
            '1': [58, 48, 48, 48, 48, 48, 48]  # Actual episode runtimes for season 1
        }
    }
    
    actual_time = service.calculate_show_time(show_with_precise_data)
    expected_time = 58 + 48 + 48 + 48 + 48 + 48 + 48  # 346 minutes
    
    assert actual_time == expected_time
    
    # Test show with multiple seasons of precise data
    show_multi_season = {
        'seasons_watched': 2,
        'episode_run_time': 47,
        'total_episodes': 62,
        'total_seasons': 5,
        'episode_runtimes': {
            '1': [58, 48, 48, 48, 48, 48, 48],  # Season 1: 346 minutes
            '2': [47, 47, 47, 47, 47, 47, 47, 47, 47, 47, 47, 47, 47]  # Season 2: 611 minutes
        }
    }
    
    actual_multi = service.calculate_show_time(show_multi_season)
    expected_multi = 346 + 611  # 957 minutes
    
    assert actual_multi == expected_multi
    
    # Test show with partial precise data (some seasons have episode data, others don't)
    show_partial_data = {
        'seasons_watched': 2,
        'episode_run_time': 47,
        'total_episodes': 62,
        'total_seasons': 5,
        'episode_runtimes': {
            '1': [58, 48, 48, 48, 48, 48, 48]  # Only season 1 has precise data
            # Season 2 will fall back to average calculation: (62/5) * 47 = 583.6 ≈ 584 minutes
        }
    }
    
    actual_partial = service.calculate_show_time(show_partial_data)
    expected_partial = 346 + int((62/5) * 47)  # 346 + 584 = 930 minutes
    
    assert actual_partial == expected_partial

def test_precise_vs_average_calculation_accuracy():
    """Test that precise calculation is more accurate than average calculation."""
    service = CalculationService()
    
    # The Mandalorian Season 1: 8 episodes with varying runtimes
    # Actual: [39, 32, 37, 40, 33, 43, 40, 48] = 312 minutes (5h 12m)
    # Average would be: 8 episodes * 36 min = 288 minutes (4h 48m)
    mandalorian_precise = {
        'seasons_watched': 1,
        'episode_run_time': 36,
        'total_episodes': 24,
        'total_seasons': 3,
        'episode_runtimes': {
            '1': [39, 32, 37, 40, 33, 43, 40, 48]
        }
    }
    
    mandalorian_average = {
        'seasons_watched': 1,
        'episode_run_time': 36,
        'total_episodes': 24,
        'total_seasons': 3
        # No episode_runtimes - will use average calculation
    }
    
    precise_time = service.calculate_show_time(mandalorian_precise)
    average_time = service.calculate_show_time(mandalorian_average)
    
    expected_precise = 39 + 32 + 37 + 40 + 33 + 43 + 40 + 48  # 312 minutes
    expected_average = int(1 * (24/3) * 36)  # 288 minutes
    
    assert precise_time == expected_precise
    assert average_time == expected_average
    assert precise_time != average_time  # They should be different
    assert abs(precise_time - expected_precise) < abs(average_time - expected_precise)  # Precise is more accurate

def test_fallback_when_episode_runtime_missing():
    """Test fallback behavior when episode runtime data is missing or incomplete."""
    service = CalculationService()
    
    # Test with some episodes missing runtime data (None values)
    show_missing_data = {
        'seasons_watched': 1,
        'episode_run_time': 45,
        'total_episodes': 20,
        'total_seasons': 2,
        'episode_runtimes': {
            '1': [50, None, 48, None, 47]  # Some episodes missing runtime
        }
    }
    
    actual_time = service.calculate_show_time(show_missing_data)
    # Expected: 50 + 45 + 48 + 45 + 47 = 235 minutes (uses fallback 45 for None values)
    expected_time = 50 + 45 + 48 + 45 + 47
    
    assert actual_time == expected_time
    
    # Test with actual episode count data (like Breaking Bad: 62 episodes, 5 seasons)
    show_with_data = {
        'seasons_watched': 1,
        'episode_run_time': 47,
        'total_episodes': 62,
        'total_seasons': 5
    }
    
    # 1 season * (62/5) episodes/season * 47 minutes = 583.6 minutes ≈ 584 minutes
    expected_time_accurate = int(1 * (62/5) * 47)
    actual_time_accurate = service.calculate_show_time(show_with_data)
    
    assert actual_time_accurate == expected_time_accurate
    
    # Test with The Office data (201 episodes, 9 seasons)
    show_office = {
        'seasons_watched': 2,
        'episode_run_time': 22,
        'total_episodes': 201,
        'total_seasons': 9
    }
    
    # 2 seasons * (201/9) episodes/season * 22 minutes = 985.3 minutes ≈ 985 minutes
    expected_time_office = int(2 * (201/9) * 22)
    actual_time_office = service.calculate_show_time(show_office)
    
    assert actual_time_office == expected_time_office

def test_calculate_total_time():
    """Test calculating total time across multiple shows."""
    service = CalculationService()
    
    shows = [
        {'seasons_watched': 1, 'episode_run_time': 45},  # Fallback: 900 minutes
        {
            'seasons_watched': 2, 
            'episode_run_time': 30,
            'total_episodes': 40,
            'total_seasons': 2
        },  # Accurate: 2 * (40/2) * 30 = 1200 minutes
    ]
    
    expected_total = (1 * 20 * 45) + (2 * (40/2) * 30)  # 900 + 1200 = 2100
    actual_total = service.calculate_total_time(shows)
    
    assert actual_total == expected_total

def test_format_time_minutes():
    """Test formatting time in minutes."""
    service = CalculationService()
    
    assert service.format_time(0) == "0h"
    assert service.format_time(30) == "30 minutes"
    assert service.format_time(90) == "1h 30m"
    assert service.format_time(120) == "2h"
    assert service.format_time(1500) == "1d 1h"  # 25 hours
    assert service.format_time(1440) == "1d 0h"  # 24 hours - always show hours

def test_calculate_stats_empty():
    """Test calculating stats with no shows."""
    service = CalculationService()
    
    stats = service.calculate_stats([])
    
    assert stats['total_shows'] == 0
    assert stats['total_seasons'] == 0
    assert stats['total_time_minutes'] == 0
    assert stats['completion_stats']['completed_shows'] == 0

def test_calculate_stats_with_shows():
    """Test calculating stats with shows."""
    service = CalculationService()
    
    shows = [
        {
            'seasons_watched': 2,
            'total_seasons': 3,
            'episode_run_time': 45,
            'genres': [{'name': 'Drama'}],
            'first_air_date': '2020-01-01'
        },
        {
            'seasons_watched': 1,
            'total_seasons': 1,
            'episode_run_time': 30,
            'genres': [{'name': 'Comedy'}],
            'first_air_date': '2021-05-15'
        }
    ]
    
    stats = service.calculate_stats(shows)
    
    assert stats['total_shows'] == 2
    assert stats['total_seasons'] == 3  # 2 + 1 seasons watched
    assert stats['completion_stats']['completed_shows'] == 1  # Second show is complete
    assert stats['completion_stats']['in_progress_shows'] == 1  # First show is in progress

def test_accurate_calculation_with_real_show_data():
    """Test that calculations are more accurate with real TMDB data (fallback method)."""
    service = CalculationService()
    
    # Breaking Bad: 62 episodes, 5 seasons, ~47 min runtime
    breaking_bad_1_season = {
        'seasons_watched': 1,
        'episode_run_time': 47,
        'total_episodes': 62,
        'total_seasons': 5
    }
    
    # The Office: 201 episodes, 9 seasons, ~22 min runtime
    office_1_season = {
        'seasons_watched': 1,
        'episode_run_time': 22,
        'total_episodes': 201,
        'total_seasons': 9
    }
    
    # The Mandalorian: 24 episodes, 3 seasons, ~36 min runtime
    mandalorian_1_season = {
        'seasons_watched': 1,
        'episode_run_time': 36,
        'total_episodes': 24,
        'total_seasons': 3
    }
    
    # Calculate times using average method (no episode_runtimes provided)
    bb_time = service.calculate_show_time(breaking_bad_1_season)
    office_time = service.calculate_show_time(office_1_season)
    mando_time = service.calculate_show_time(mandalorian_1_season)
    
    # Expected: Breaking Bad = 1 * (62/5) * 47 = 583.6 ≈ 582 minutes
    # Expected: The Office = 1 * (201/9) * 22 = 492.7 ≈ 491 minutes  
    # Expected: The Mandalorian = 1 * (24/3) * 36 = 288 minutes
    
    # Old calculation would give all shows: 1 * 20 * runtime = 940, 440, 720 minutes
    # New calculation should be more accurate and different for each show
    
    assert bb_time == 582  # Breaking Bad: ~9.7h instead of 15.7h
    assert office_time == 491  # The Office: ~8.2h instead of 7.3h  
    assert mando_time == 288  # The Mandalorian: ~4.8h instead of 12h
    
    # Verify these are different from the old hardcoded calculation
    old_bb = 1 * 20 * 47  # 940 minutes
    old_office = 1 * 20 * 22  # 440 minutes
    old_mando = 1 * 20 * 36  # 720 minutes
    
    assert bb_time != old_bb
    assert office_time != old_office  
    assert mando_time != old_mando

def test_calculate_awards():
    """Test calculating awards for watched shows."""
    service = CalculationService()
    
    shows = [
        {
            'name': 'Breaking Bad',
            'seasons_watched': 5,
            'total_seasons': 5,
            'total_episodes': 62,
            'episode_run_time': 47,
            'first_air_date': '2008-01-20',
            'popularity': 95.5
        },
        {
            'name': 'The Office',
            'seasons_watched': 9,
            'total_seasons': 9,
            'total_episodes': 201,
            'episode_run_time': 22,
            'first_air_date': '2005-03-24',
            'popularity': 78.2
        },
        {
            'name': 'Stranger Things',
            'seasons_watched': 4,
            'total_seasons': 4,
            'total_episodes': 42,
            'episode_run_time': 50,
            'first_air_date': '2016-07-15',
            'popularity': 125.8
        },
        {
            'name': 'Obscure Show',
            'seasons_watched': 1,
            'total_seasons': 1,
            'total_episodes': 6,
            'episode_run_time': 30,
            'first_air_date': '2022-01-01',
            'popularity': 5.2
        }
    ]
    
    awards = service.calculate_awards(shows)
    
    # Test oldest show
    assert awards['oldest_show']['name'] == 'The Office'
    assert awards['oldest_show']['year'] == 2005
    
    # Test most episodes show
    assert awards['most_episodes_show']['name'] == 'The Office'
    assert awards['most_episodes_show']['episodes'] == 201  # 9 seasons * (201/9) episodes per season
    
    # Test most watch time show
    assert awards['most_watch_time_show']['name'] == 'The Office'
    
    # Test most obscure show (lowest popularity)
    assert awards['most_obscure_show']['name'] == 'Obscure Show'
    assert awards['most_obscure_show']['popularity'] == 5.2

def test_calculate_awards_empty():
    """Test calculating awards with no shows."""
    service = CalculationService()
    
    awards = service.calculate_awards([])
    
    assert awards['oldest_show'] is None
    assert awards['most_episodes_show'] is None
    assert awards['most_watch_time_show'] is None
    assert awards['most_obscure_show'] is None