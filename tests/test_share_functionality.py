import pytest
from app import create_app
from config import Config


@pytest.fixture
def client():
    """Create a test client for the app."""
    # Override config for testing
    Config.TMDB_API_KEY = 'test-api-key'
    Config.SECRET_KEY = 'test-secret-key'
    
    app = create_app()
    app.config['TESTING'] = True
    
    with app.test_client() as client:
        yield client


class TestShareFunctionality:
    """Test the share button functionality"""

    def test_index_page_contains_share_button(self, client):
        """Test that the main page contains the share button"""
        response = client.get('/')
        assert response.status_code == 200
        
        # Check that the share button HTML is present
        html_content = response.data.decode('utf-8')
        assert 'id="shareBtn"' in html_content
        assert 'Share My Stats' in html_content
        assert 'btn-share' in html_content

    def test_share_button_javascript_function_exists(self, client):
        """Test that the shareStats function exists in the JavaScript"""
        response = client.get('/static/js/app.js')
        assert response.status_code == 200
        
        js_content = response.data.decode('utf-8')
        assert 'shareStats()' in js_content
        assert 'navigator.share' in js_content
        assert 'navigator.clipboard.writeText' in js_content

    def test_share_button_css_styling_exists(self, client):
        """Test that the share button CSS styles are defined"""
        response = client.get('/static/css/style.css')
        assert response.status_code == 200
        
        css_content = response.data.decode('utf-8')
        assert '.btn-share' in css_content
        assert 'linear-gradient' in css_content  # The share button has a gradient background

    def test_share_functionality_elements_are_initialized(self, client):
        """Test that all necessary DOM elements for sharing are initialized"""
        response = client.get('/')
        assert response.status_code == 200
        
        html_content = response.data.decode('utf-8')
        # Check that the necessary elements exist
        assert 'id="shareBtn"' in html_content
        assert 'id="totalWatchTime"' in html_content
        assert 'id="toastContainer"' in html_content  # For showing feedback