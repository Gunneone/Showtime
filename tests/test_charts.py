import pytest
from services.calculation_service import CalculationService

def test_fun_conversions_calculation():
    """Test fun time conversions calculation."""
    calc_service = CalculationService()
    
    # Test with 2880 minutes (48 hours)
    conversions = calc_service.calculate_fun_conversions(2880)
    
    assert len(conversions) == 9
    # Check new order: Hyperbullet Chess, Teen Spirit, 30-min walk, Flight, LotR Extended, Harry Potter, Trans-Siberian, Learn Language, Baby
    assert conversions[0]['icon'] == 'fas fa-chess-pawn'
    assert 'hyperbullet chess' in conversions[0]['description']
    assert conversions[1]['icon'] == 'fas fa-music'
    assert 'Smells Like Teen Spirit' in conversions[1]['description']
    assert conversions[2]['icon'] == 'fas fa-walking'
    assert '30-minute walk' in conversions[2]['description']
    assert conversions[3]['icon'] == 'fas fa-plane'
    assert 'flight between NY and Chicago' in conversions[3]['description']
    assert conversions[4]['icon'] == 'fas fa-ring'
    assert 'LotR trilogy' in conversions[4]['description']
    assert conversions[5]['icon'] == 'fas fa-book'
    assert 'Harry Potter' in conversions[5]['description']
    assert conversions[6]['icon'] == 'fas fa-train'
    assert 'Trans-Siberian Railway' in conversions[6]['description']
    assert conversions[7]['icon'] == 'fas fa-language'
    assert 'learned a language' in conversions[7]['description']
    assert conversions[8]['icon'] == 'fas fa-baby'
    assert 'carried out a baby' in conversions[8]['description']

def test_show_length_distribution():
    """Test show length distribution calculation."""
    calc_service = CalculationService()
    
    # Test shows with different runtimes
    shows = [
        {'episode_run_time': 25, 'seasons_watched': 1},  # Short
        {'episode_run_time': 45, 'seasons_watched': 2},  # Standard
        {'episode_run_time': 75, 'seasons_watched': 1},  # Long
        {'episode_run_time': 120, 'seasons_watched': 1}, # Very Long
    ]
    
    distribution = calc_service.get_show_length_distribution(shows)
    
    assert 'Short (< 30min)' in distribution
    assert 'Standard (30-60min)' in distribution
    assert 'Long (60-90min)' in distribution
    assert 'Very Long (> 90min)' in distribution
    
    # Check that all have some time allocated
    assert distribution['Short (< 30min)'] > 0
    assert distribution['Standard (30-60min)'] > 0
    assert distribution['Long (60-90min)'] > 0
    assert distribution['Very Long (> 90min)'] > 0

def test_enhanced_stats_calculation():
    """Test that enhanced stats include new fields."""
    calc_service = CalculationService()
    
    # Test with sample shows
    shows = [
        {
            'episode_run_time': 45,
            'seasons_watched': 2,
            'total_seasons': 5,
            'first_air_date': '2020-01-01',
            'genres': [{'name': 'Drama'}, {'name': 'Comedy'}]
        },
        {
            'episode_run_time': 30,
            'seasons_watched': 1,
            'total_seasons': 1,
            'first_air_date': '2021-06-15',
            'genres': [{'name': 'Comedy'}]
        }
    ]
    
    stats = calc_service.calculate_stats(shows)
    
    # Check that new fields are present
    assert 'fun_conversions' in stats
    assert 'show_length_distribution' in stats
    assert isinstance(stats['fun_conversions'], list)
    assert isinstance(stats['show_length_distribution'], dict)
    
    # Check fun conversions
    assert len(stats['fun_conversions']) == 9
    for conversion in stats['fun_conversions']:
        assert 'icon' in conversion
        assert 'value' in conversion
        assert 'description' in conversion

def test_empty_state_includes_new_fields():
    """Test that empty state includes new fields."""
    calc_service = CalculationService()
    
    stats = calc_service.calculate_stats([])
    
    assert 'fun_conversions' in stats
    assert 'show_length_distribution' in stats
    assert stats['fun_conversions'] == []
    assert stats['show_length_distribution'] == {}