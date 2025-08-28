import pytest
from app import create_app

@pytest.fixture
def client():
    """Create test client."""
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_impressum_page_exists(client):
    """Test that the Impressum page loads successfully."""
    response = client.get('/impressum')
    assert response.status_code == 200
    assert b'Impressum' in response.data
    assert b'Angaben gem\xc3\xa4\xc3\x9f \xc2\xa7 5 TMG' in response.data

def test_impressum_contains_required_german_legal_info(client):
    """Test that the Impressum contains required German legal information."""
    response = client.get('/impressum')
    assert response.status_code == 200
    
    # Check for required German legal sections
    assert b'Verantwortlich f\xc3\xbcr den Inhalt:' in response.data
    assert b'Marius Gunnemann' in response.data
    assert b'Deutschland' in response.data
    assert b'Kontakt:' in response.data
    assert b'Haftungsausschluss:' in response.data
    assert b'Datenschutz' in response.data

def test_impressum_contains_contact_info(client):
    """Test that the Impressum contains proper contact information."""
    response = client.get('/impressum')
    assert response.status_code == 200
    
    # Check for contact information
    assert b'github.com/Gunneone' in response.data
    assert b'github.com/Gunneone/Showtime' in response.data

def test_impressum_link_in_footer(client):
    """Test that the main page footer contains the Impressum link."""
    response = client.get('/')
    assert response.status_code == 200
    
    # Check that footer contains Impressum link
    assert b'Impressum' in response.data
    assert b'url_for(\'main.impressum\')' in response.data or b'/impressum' in response.data

def test_impressum_page_title(client):
    """Test that the Impressum page has the correct title."""
    response = client.get('/impressum')
    assert response.status_code == 200
    assert b'<title>Impressum - Showtime</title>' in response.data