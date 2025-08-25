import pytest
from services.calculation_service import CalculationService

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
    """Test that calculations are more accurate with real TMDB data."""
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
    
    # Calculate times
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