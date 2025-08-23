import pytest
from services.calculation_service import CalculationService

def test_calculation_service_init():
    """Test that CalculationService initializes correctly."""
    service = CalculationService()
    assert service is not None

def test_calculate_show_time():
    """Test calculating watch time for a single show."""
    service = CalculationService()
    
    show = {
        'seasons_watched': 2,
        'episode_run_time': 45
    }
    
    # 2 seasons * 20 episodes/season * 45 minutes = 1800 minutes
    expected_time = 2 * 20 * 45
    actual_time = service.calculate_show_time(show)
    
    assert actual_time == expected_time

def test_calculate_total_time():
    """Test calculating total time across multiple shows."""
    service = CalculationService()
    
    shows = [
        {'seasons_watched': 1, 'episode_run_time': 45},  # 900 minutes
        {'seasons_watched': 2, 'episode_run_time': 30},  # 1200 minutes
    ]
    
    expected_total = (1 * 20 * 45) + (2 * 20 * 30)  # 900 + 1200 = 2100
    actual_total = service.calculate_total_time(shows)
    
    assert actual_total == expected_total

def test_format_time_minutes():
    """Test formatting time in minutes."""
    service = CalculationService()
    
    assert service.format_time(30) == "30 minutes"
    assert service.format_time(90) == "1h 30m"
    assert service.format_time(120) == "2h"
    assert service.format_time(1500) == "1d 1h"  # 25 hours
    assert service.format_time(1440) == "1d"     # 24 hours

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