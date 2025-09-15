"""
Tests for confetti animation fix on first show addition.
This test ensures that the confetti animation logic is triggered correctly
when a user adds their very first show.
"""

def test_confetti_animation_fix():
    """
    Test that the JavaScript code correctly handles the confetti animation
    for the first show addition by checking the key logic changes.
    """
    # Read the JavaScript file
    with open('src/static/js/app.js', 'r') as f:
        js_content = f.read()
    
    # Verify that updateTotalTimeDisplay has the isUserTriggered parameter
    assert 'updateTotalTimeDisplay(formattedTime, newTimeMinutes = null, isUserTriggered = false)' in js_content, \
        "updateTotalTimeDisplay should accept isUserTriggered parameter"
    
    # Verify that the method properly handles user-triggered vs initial load
    assert 'if (this.state.isInitialLoad && !isUserTriggered)' in js_content, \
        "Method should check both isInitialLoad and isUserTriggered"
    
    # Verify that loadWatchedShows accepts isUserTriggered parameter  
    assert 'async loadWatchedShows(isUserTriggered = false)' in js_content, \
        "loadWatchedShows should accept isUserTriggered parameter"
    
    # Verify that user actions pass true for isUserTriggered
    user_triggered_calls = [
        'this.loadWatchedShows(true)',  # Should appear multiple times for user actions
    ]
    
    for call in user_triggered_calls:
        assert call in js_content, f"User-triggered call '{call}' should be present"
    
    # Verify that the initial load call remains false (default)
    assert 'this.loadWatchedShows();' in js_content, \
        "Initial load should still use default (false) for isUserTriggered"
    
    # Verify that the animation condition was updated correctly
    assert 'if (this.state.totalTime !== this.state.previousTotalTime)' in js_content, \
        "Animation should trigger for any time change, including first show"
    
    # Verify that isInitialLoad is still set to false after first interaction
    assert 'this.state.isInitialLoad = false;' in js_content, \
        "isInitialLoad should be set to false after first user interaction"

def test_confetti_trigger_conditions():
    """
    Test that the confetti animation logic has the correct trigger conditions.
    """
    with open('src/static/js/app.js', 'r') as f:
        js_content = f.read()
    
    # Verify that triggerCelebrationEffect is called for increases
    assert 'this.triggerCelebrationEffect(element, timeDifference, intensityFactor)' in js_content, \
        "triggerCelebrationEffect should be called in animateTimeValue"
    
    # Verify that the confetti effect checks for library availability
    assert 'if (typeof confetti !== \'function\')' in js_content, \
        "Should check if confetti library is loaded"
    
    # Verify that confetti warning is shown when library not loaded
    assert 'console.warn(\'canvas-confetti library not loaded\')' in js_content, \
        "Should warn when confetti library is not loaded"

if __name__ == '__main__':
    test_confetti_animation_fix()
    test_confetti_trigger_conditions()
    print("✅ All confetti animation fix tests passed!")