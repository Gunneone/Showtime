import hmac

from flask import (
    Blueprint, abort, current_app, redirect, render_template, request,
    session, url_for,
)

from ..services.metrics_service import get_metrics_service

main_bp = Blueprint('main', __name__)

# Session key marking an authenticated dashboard viewer.
ADMIN_SESSION_KEY = 'showtime_admin'


@main_bp.route('/')
def index():
    """Main application page."""
    return render_template('index.html')

@main_bp.route('/stats')
def stats():
    """Statistics dashboard page."""
    return render_template('stats.html')


@main_bp.route('/privacy')
def privacy():
    """What Showtime does and does not collect."""
    return render_template('privacy.html')


def _admin_token():
    """The configured dashboard password, or None when the feature is off."""
    return current_app.config.get('ADMIN_TOKEN')


@main_bp.route('/admin/usage', methods=['GET'])
def admin_usage():
    """Aggregate usage dashboard.

    Not linked from anywhere in the UI, but the path is guessable and this repo
    is public, so the password is what actually protects it. With no token
    configured the route 404s rather than rendering a login form - a
    deployment that never set one should not advertise a dashboard at all.
    """
    if not _admin_token():
        abort(404)

    if not session.get(ADMIN_SESSION_KEY):
        return render_template('admin_login.html'), 401

    try:
        overview = get_metrics_service().get_overview(days=30)
        error = None
    except Exception:
        current_app.logger.exception('Failed to build metrics overview')
        overview, error = None, 'Could not read the metrics database.'

    return render_template('admin_usage.html', overview=overview, error=error)


@main_bp.route('/admin/login', methods=['POST'])
def admin_login():
    """Check the dashboard password.

    The token arrives as a POSTed form field rather than a query parameter
    because start.sh runs Gunicorn with --access-logfile -, which would write
    a querystring token into the container logs on every request.
    """
    token = _admin_token()
    if not token:
        abort(404)

    submitted = request.form.get('token', '')
    if hmac.compare_digest(submitted, token):
        session[ADMIN_SESSION_KEY] = True
        return redirect(url_for('main.admin_usage'))

    return render_template('admin_login.html', failed=True), 401


@main_bp.route('/admin/logout', methods=['POST'])
def admin_logout():
    """Drop the dashboard session."""
    session.pop(ADMIN_SESSION_KEY, None)
    return redirect(url_for('main.index'))
