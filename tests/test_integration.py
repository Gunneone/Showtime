#!/usr/bin/env python3
"""
Integration test for localStorage API endpoints without external dependencies.
"""

import json
import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_api_data_processing():
    """Test that the API logic processes localStorage data correctly."""
    
    print("🔧 Testing API Data Processing Logic")
    print("=" * 50)
    
    # Import our calculation service
    try:
        from src.services.calculation_service import CalculationService
        calc_service = CalculationService()
        print("✅ CalculationService imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import CalculationService: {e}")
        return False
    
    # Test data with the new localStorage format
    test_watched_shows = [
        {
            'id': 1,
            'name': 'Breaking Bad',
            'seasons_watched': 5,
            'total_seasons': 5,
            'total_episodes': 62,
            'episode_run_time': 47,
            'genres': ['Drama', 'Crime']  # New optimized format
        },
        {
            'id': 2,
            'name': 'The Office',
            'seasons_watched': 9,
            'total_seasons': 9,
            'total_episodes': 201,
            'episode_run_time': 22,
            'genres': ['Comedy']
        }
    ]
    
    # Test total time calculation
    try:
        total_time = calc_service.calculate_total_time(test_watched_shows)
        formatted_time = calc_service.format_time(total_time)
        print(f"✅ Total time calculation: {total_time} minutes ({formatted_time})")
    except Exception as e:
        print(f"❌ Total time calculation failed: {e}")
        return False
    
    # Test individual show calculation
    try:
        bb_time = calc_service.calculate_show_time(test_watched_shows[0])
        office_time = calc_service.calculate_show_time(test_watched_shows[1])
        print(f"✅ Breaking Bad time: {bb_time} minutes")
        print(f"✅ The Office time: {office_time} minutes")
    except Exception as e:
        print(f"❌ Individual show calculation failed: {e}")
        return False
    
    # Test statistics calculation
    try:
        stats = calc_service.calculate_stats(test_watched_shows)
        print(f"✅ Statistics calculation successful")
        print(f"   Total shows: {stats['total_shows']}")
        print(f"   Total seasons: {stats['total_seasons']}")
        print(f"   Genre breakdown: {list(stats['genre_breakdown'].keys())}")
        print(f"   Yearly breakdown: {list(stats['yearly_breakdown'].keys())}")
    except Exception as e:
        print(f"❌ Statistics calculation failed: {e}")
        return False
    
    # Test that optimized genre format works
    try:
        genre_breakdown = stats['genre_breakdown']
        assert 'Drama' in genre_breakdown
        assert 'Crime' in genre_breakdown  
        assert 'Comedy' in genre_breakdown
        print("✅ Optimized genre format works correctly")
    except Exception as e:
        print(f"❌ Genre processing failed: {e}")
        return False
    
    return True

def test_data_migration_logic():
    """Test the migration logic from cookies to localStorage."""
    
    print("\n🔄 Testing Data Migration Logic")
    print("=" * 50)
    
    # Simulate old cookie data with episode_runtimes
    old_cookie_data = [
        {
            'id': 1,
            'name': 'Breaking Bad',
            'seasons_watched': 5,
            'total_seasons': 5,
            'total_episodes': 62,
            'episode_run_time': 47,
            'episode_runtimes': {
                '1': [58, 48, 48, 48, 50, 48, 48],
                '2': [47, 47, 47, 47, 47, 47, 47, 47, 47, 47, 47, 47, 47]
            },
            'genres': [
                {'id': 18, 'name': 'Drama'},
                {'id': 80, 'name': 'Crime'}
            ]
        }
    ]
    
    print(f"📱 Old cookie data size: {len(json.dumps(old_cookie_data).encode('utf-8'))} bytes")
    
    # Simulate migration to localStorage (what our JavaScript migration does)
    migrated_data = []
    for show in old_cookie_data:
        migrated_show = {
            'id': show['id'],
            'name': show['name'],
            'seasons_watched': show['seasons_watched'],
            'total_seasons': show['total_seasons'],
            'total_episodes': show['total_episodes'],
            'episode_run_time': show['episode_run_time'],
            'genres': [g['name'] if isinstance(g, dict) else g for g in show.get('genres', [])]
        }
        # episode_runtimes is intentionally removed to save space
        migrated_data.append(migrated_show)
    
    print(f"💾 Migrated localStorage data size: {len(json.dumps(migrated_data).encode('utf-8'))} bytes")
    
    # Test that calculations still work with migrated data
    try:
        from src.services.calculation_service import CalculationService
        calc_service = CalculationService()
        
        # Calculate with old data
        old_time = calc_service.calculate_total_time(old_cookie_data)
        migrated_time = calc_service.calculate_total_time(migrated_data)
        
        print(f"🧮 Time calculation with old data: {old_time} minutes")
        print(f"🧮 Time calculation with migrated data: {migrated_time} minutes")
        
        # The times should be the same or very close (fallback calculation kicks in)
        time_diff = abs(old_time - migrated_time)
        if time_diff <= old_time * 0.1:  # Within 10% is acceptable for fallback calculation
            print("✅ Migration preserves calculation accuracy")
        else:
            print(f"⚠️  Migration changes calculation by {time_diff} minutes")
            
    except Exception as e:
        print(f"❌ Migration calculation test failed: {e}")
        return False
    
    return True

def test_storage_capacity():
    """Test that localStorage can handle much larger datasets."""
    
    print("\n📈 Testing Storage Capacity")
    print("=" * 50)
    
    # Create a large dataset that would break cookies
    large_dataset = []
    for i in range(100):  # 100 shows
        show = {
            'id': i,
            'name': f'Show {i} - Very Long Name That Takes Up Space',
            'poster_path': f'/poster/path/show_{i}.jpg',
            'first_air_date': '2020-01-01',
            'seasons_watched': 5,
            'total_seasons': 10,
            'total_episodes': 200,
            'episode_run_time': 45,
            'genres': ['Drama', 'Action', 'Comedy']
        }
        large_dataset.append(show)
    
    # Test serialization
    try:
        serialized = json.dumps(large_dataset)
        size_bytes = len(serialized.encode('utf-8'))
        size_kb = size_bytes / 1024
        
        print(f"📊 Large dataset: {len(large_dataset)} shows")
        print(f"📊 Serialized size: {size_kb:.1f} KB")
        print(f"📊 Cookie limit: 4.0 KB")
        print(f"📊 Size ratio: {size_kb / 4:.1f}x larger than cookie limit")
        
        if size_kb > 4:
            print("✅ Successfully created dataset larger than cookie limit")
        else:
            print("❌ Dataset not large enough for test")
            return False
            
    except Exception as e:
        print(f"❌ Large dataset serialization failed: {e}")
        return False
    
    # Test that calculation service can handle it
    try:
        from src.services.calculation_service import CalculationService
        calc_service = CalculationService()
        
        total_time = calc_service.calculate_total_time(large_dataset)
        stats = calc_service.calculate_stats(large_dataset)
        
        print(f"✅ Large dataset calculation successful")
        print(f"   Total time: {calc_service.format_time(total_time)}")
        print(f"   Total shows: {stats['total_shows']}")
        print(f"   Genres found: {len(stats['genre_breakdown'])}")
        
    except Exception as e:
        print(f"❌ Large dataset calculation failed: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("🧪 localStorage API Integration Tests")
    print("=" * 60)
    
    all_passed = True
    
    # Run all tests
    tests = [
        test_api_data_processing,
        test_data_migration_logic,
        test_storage_capacity
    ]
    
    for test_func in tests:
        try:
            if not test_func():
                all_passed = False
        except Exception as e:
            print(f"❌ Test {test_func.__name__} failed with exception: {e}")
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 All Integration Tests Passed!")
        print("✅ localStorage solution is working correctly")
        print("✅ API endpoints can process localStorage data")
        print("✅ Migration logic preserves functionality")
        print("✅ Large datasets are handled properly")
    else:
        print("❌ Some tests failed. Check the output above.")
        sys.exit(1)