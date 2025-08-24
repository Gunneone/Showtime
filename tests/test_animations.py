"""Test animation functionality"""
import pytest

def test_animation_css_classes_exist():
    """Test that the required animation CSS classes are present."""
    from app import app
    
    with app.test_client() as client:
        response = client.get('/static/css/style.css')
        assert response.status_code == 200
        
        css_content = response.data.decode('utf-8')
        
        # Check for animation-related CSS
        assert 'timeUpdate' in css_content
        assert 'timeIncrease' in css_content
        assert 'timeDecrease' in css_content
        assert '@keyframes timeUpdate' in css_content
        assert '@keyframes timeIncrease' in css_content
        assert '@keyframes timeDecrease' in css_content
        assert 'time-celebration' in css_content
        assert 'particle' in css_content


def test_animation_javascript_functions_exist():
    """Test that the animation JavaScript functions are present."""
    from app import app
    
    with app.test_client() as client:
        response = client.get('/static/js/app.js')
        assert response.status_code == 200
        
        js_content = response.data.decode('utf-8')
        
        # Check for animation-related JavaScript functions
        assert 'animateTimeValue' in js_content
        assert 'triggerCelebrationEffect' in js_content
        assert 'previousTotalTime' in js_content
        assert 'newTimeMinutes' in js_content


def test_watched_api_returns_time_data():
    """Test that the watched API returns the time data needed for animations."""
    from app import app
    
    with app.test_client() as client:
        response = client.get('/api/watched')
        assert response.status_code == 200
        
        data = response.get_json()
        assert 'total_time_minutes' in data
        assert 'total_time_formatted' in data