"""
Background scheduler service for running maintenance tasks.
Handles daily cache cleanup and other periodic tasks.
"""

import threading
import time
from datetime import datetime, timedelta
from services.persistent_cache_service import get_persistent_cache


class BackgroundScheduler:
    """Simple background scheduler for maintenance tasks."""
    
    def __init__(self):
        self.running = False
        self.thread = None
        self.persistent_cache = get_persistent_cache()
        self.last_cleanup = datetime.now()
    
    def start(self):
        """Start the background scheduler."""
        if self.running:
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.thread.start()
        print("Background scheduler started")
    
    def stop(self):
        """Stop the background scheduler."""
        self.running = False
        if self.thread:
            self.thread.join(timeout=1)
        print("Background scheduler stopped")
    
    def _run_scheduler(self):
        """Main scheduler loop."""
        while self.running:
            try:
                # Check if we need to run daily cleanup
                if self._should_run_daily_cleanup():
                    self._run_daily_cleanup()
                
                # Sleep for 1 hour before checking again
                time.sleep(3600)  # 1 hour
                
            except Exception as e:
                print(f"Error in background scheduler: {e}")
                time.sleep(300)  # Sleep 5 minutes on error
    
    def _should_run_daily_cleanup(self):
        """Check if daily cleanup should run."""
        now = datetime.now()
        time_since_last = now - self.last_cleanup
        return time_since_last >= timedelta(hours=24)
    
    def _run_daily_cleanup(self):
        """Run daily cache cleanup tasks."""
        try:
            print("Running daily cache cleanup...")
            cleaned_count = self.persistent_cache.cleanup_expired()
            self.last_cleanup = datetime.now()
            print(f"Daily cache cleanup completed. Removed {cleaned_count} expired entries.")
        except Exception as e:
            print(f"Error during daily cleanup: {e}")


# Global scheduler instance
_scheduler = None


def get_scheduler() -> BackgroundScheduler:
    """Get the global scheduler instance."""
    global _scheduler
    if _scheduler is None:
        _scheduler = BackgroundScheduler()
    return _scheduler


def start_background_tasks():
    """Start all background tasks."""
    scheduler = get_scheduler()
    scheduler.start()


def stop_background_tasks():
    """Stop all background tasks."""
    scheduler = get_scheduler()
    scheduler.stop()