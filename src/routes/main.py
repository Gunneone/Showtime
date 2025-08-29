from flask import Blueprint, render_template

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    """Main application page."""
    return render_template('index.html')

@main_bp.route('/stats')
def stats():
    """Statistics dashboard page."""
    return render_template('stats.html')