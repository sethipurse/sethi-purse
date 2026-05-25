#!/usr/bin/env python3
"""
Phase 2 Backend API tests for SETHI PURSE
Tests: offers, inquiries, reviews endpoints
"""
import requests
import json
import sys

BASE_URL = "https://sethi-purse-store.preview.emergentagent.com/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def log_test(name, passed, details=""):
    status = f"{Colors.GREEN}✅ PASS{Colors.END}" if passed else f"{Colors.RED}❌ FAIL{Colors.END}"
    print(f"{status} - {name}")
    if details:
        print(f"  {details}")
    return passed

def test_offers_api():
    """Test Offers CRUD operations"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}TESTING OFFERS API{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}\n")
    
    results = []
    created_offer_ids = []
    
    # Test 1: GET /api/offers - should return seeded offers sorted by createdAt desc
    try:
        resp = requests.get(f"{BASE_URL}/offers", timeout=10)
        passed = resp.status_code == 200
        if passed:
            offers = resp.json()
            passed = isinstance(offers, list)
            if passed:
                # Check if sorted by createdAt desc
                dates = [o.get('createdAt') for o in offers]
                sorted_dates = sorted(dates, reverse=True)
                is_sorted = dates == sorted_dates
                
                # Check for seeded offers
                titles = [o.get('title') for o in offers]
                has_seeded = any('Back to School' in t or 'Wallet Week' in t for t in titles if t)
                
                # Check all have isActive:true
                all_active = all(o.get('isActive') is True for o in offers)
                
                results.append(log_test("GET /api/offers returns array sorted by createdAt desc", passed and is_sorted, 
                    f"Found {len(offers)} offers, sorted: {is_sorted}, has seeded: {has_seeded}, all active: {all_active}"))
            else:
                results.append(log_test("GET /api/offers returns array", False, f"Response is not a list"))
        else:
            results.append(log_test("GET /api/offers returns 200", False, f"Status: {resp.status_code}"))
    except Exception as e:
        results.append(log_test("GET /api/offers", False, f"Error: {str(e)}"))
    
    # Test 2: POST /api/offers - create new offer with valid data
    try:
        new_offer = {
            "title": "Test Sale",
            "description": "Test desc",
            "bannerUrl": "https://placehold.co/800x450",
            "expiryDate": "2026-12-31",
            "isActive": True
        }
        resp = requests.post(f"{BASE_URL}/offers", json=new_offer, timeout=10)
        passed = resp.status_code == 201
        if passed:
            offer = resp.json()
            offer_id = offer.get('id')
            created_offer_ids.append(offer_id)
            checks = [
                offer.get('id') is not None,
                offer.get('title') == "Test Sale",
                offer.get('description') == "Test desc",
                offer.get('isActive') is True,
                offer.get('createdAt') is not None
            ]
            passed = all(checks)
            results.append(log_test("POST /api/offers creates offer with UUID, IST createdAt, isActive preserved", passed,
                f"ID: {offer_id}, isActive: {offer.get('isActive')}, createdAt: {offer.get('createdAt')}"))
        else:
            results.append(log_test("POST /api/offers returns 201", False, 
                f"Status: {resp.status_code}, Body: {resp.text}"))
    except Exception as e:
        results.append(log_test("POST /api/offers", False, f"Error: {str(e)}"))
    
    # Test 3: POST /api/offers - without title should return 400
    try:
        invalid_offer = {
            "description": "Test desc",
            "bannerUrl": "https://placehold.co/800x450"
        }
        resp = requests.post(f"{BASE_URL}/offers", json=invalid_offer, timeout=10)
        passed = resp.status_code == 400
        if passed:
            error = resp.json()
            passed = error.get('error') == 'Title required'
        results.append(log_test("POST /api/offers without title returns 400 with 'Title required'", passed,
            f"Status: {resp.status_code}, Response: {resp.text[:100]}"))
    except Exception as e:
        results.append(log_test("POST /api/offers validation", False, f"Error: {str(e)}"))
    
    # Test 4: PUT /api/offers/{id} - toggle isActive to false
    if created_offer_ids:
        try:
            update_data = {"isActive": False}
            resp = requests.put(f"{BASE_URL}/offers/{created_offer_ids[0]}", json=update_data, timeout=10)
            passed = resp.status_code == 200
            if passed:
                offer = resp.json()
                passed = offer.get('isActive') is False
            results.append(log_test(f"PUT /api/offers/{created_offer_ids[0]} toggles isActive to false", passed,
                f"Status: {resp.status_code}, isActive: {offer.get('isActive') if passed else 'N/A'}"))
        except Exception as e:
            results.append(log_test("PUT /api/offers toggle isActive", False, f"Error: {str(e)}"))
    
    # Test 5: PUT /api/offers/{id} - update title and expiryDate
    if created_offer_ids:
        try:
            update_data = {
                "title": "Updated Sale",
                "expiryDate": "2027-01-01"
            }
            resp = requests.put(f"{BASE_URL}/offers/{created_offer_ids[0]}", json=update_data, timeout=10)
            passed = resp.status_code == 200
            if passed:
                offer = resp.json()
                passed = offer.get('title') == "Updated Sale" and offer.get('expiryDate') == "2027-01-01"
            results.append(log_test(f"PUT /api/offers/{created_offer_ids[0]} updates title and expiryDate", passed,
                f"Status: {resp.status_code}, title: {offer.get('title') if passed else 'N/A'}"))
        except Exception as e:
            results.append(log_test("PUT /api/offers update fields", False, f"Error: {str(e)}"))
    
    # Test 6: DELETE /api/offers/{id} - delete offer
    if created_offer_ids:
        try:
            resp = requests.delete(f"{BASE_URL}/offers/{created_offer_ids[0]}", timeout=10)
            passed = resp.status_code == 200
            if passed:
                result = resp.json()
                passed = result.get('success') is True
            results.append(log_test(f"DELETE /api/offers/{created_offer_ids[0]} returns success:true", passed,
                f"Status: {resp.status_code}"))
            created_offer_ids.pop(0)  # Remove from tracking
        except Exception as e:
            results.append(log_test("DELETE /api/offers/{id}", False, f"Error: {str(e)}"))
    
    # Test 7: DELETE /api/offers/nonexistent - should return 404
    try:
        resp = requests.delete(f"{BASE_URL}/offers/nonexistent-id-12345", timeout=10)
        passed = resp.status_code == 404
        results.append(log_test("DELETE /api/offers/nonexistent returns 404", passed,
            f"Status: {resp.status_code}"))
    except Exception as e:
        results.append(log_test("DELETE /api/offers/nonexistent", False, f"Error: {str(e)}"))
    
    return all(results), created_offer_ids

def test_inquiries_api():
    """Test Inquiries CRUD operations"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}TESTING INQUIRIES API{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}\n")
    
    results = []
    created_inquiry_ids = []
    
    # Test 1: GET /api/inquiries - should return array (may be empty initially)
    try:
        resp = requests.get(f"{BASE_URL}/inquiries", timeout=10)
        passed = resp.status_code == 200
        if passed:
            inquiries = resp.json()
            passed = isinstance(inquiries, list)
            results.append(log_test("GET /api/inquiries returns array", passed,
                f"Found {len(inquiries)} inquiries"))
        else:
            results.append(log_test("GET /api/inquiries returns 200", False, f"Status: {resp.status_code}"))
    except Exception as e:
        results.append(log_test("GET /api/inquiries", False, f"Error: {str(e)}"))
    
    # Test 2: POST /api/inquiries - create with valid data
    try:
        new_inquiry = {
            "name": "Rajbir Singh",
            "phone": "9876543210",
            "city": "Jalandhar",
            "productInterest": "Trolley Bags",
            "message": "Looking for a 28 inch trolley"
        }
        resp = requests.post(f"{BASE_URL}/inquiries", json=new_inquiry, timeout=10)
        passed = resp.status_code == 201
        if passed:
            inquiry = resp.json()
            inquiry_id = inquiry.get('id')
            created_inquiry_ids.append(inquiry_id)
            checks = [
                inquiry.get('id') is not None,
                inquiry.get('name') == "Rajbir Singh",
                inquiry.get('phone') == "9876543210",
                inquiry.get('status') == 'new',
                inquiry.get('createdAt') is not None
            ]
            passed = all(checks)
            results.append(log_test("POST /api/inquiries creates inquiry with status:'new', UUID, IST createdAt", passed,
                f"ID: {inquiry_id}, status: {inquiry.get('status')}, createdAt: {inquiry.get('createdAt')}"))
        else:
            results.append(log_test("POST /api/inquiries returns 201", False,
                f"Status: {resp.status_code}, Body: {resp.text}"))
    except Exception as e:
        results.append(log_test("POST /api/inquiries", False, f"Error: {str(e)}"))
    
    # Test 3: POST /api/inquiries - phone too short (should return 400)
    try:
        invalid_inquiry = {
            "name": "Test User",
            "phone": "12345",
            "city": "Test City",
            "productInterest": "Test Product",
            "message": "Test message"
        }
        resp = requests.post(f"{BASE_URL}/inquiries", json=invalid_inquiry, timeout=10)
        passed = resp.status_code == 400
        if passed:
            error = resp.json()
            passed = error.get('error') == 'Phone must be 10 digits'
        results.append(log_test("POST /api/inquiries with phone '12345' returns 400 with 'Phone must be 10 digits'", passed,
            f"Status: {resp.status_code}, Response: {resp.text[:100]}"))
    except Exception as e:
        results.append(log_test("POST /api/inquiries phone validation", False, f"Error: {str(e)}"))
    
    # Test 4: POST /api/inquiries - phone with non-digits (should strip to 10 digits)
    try:
        inquiry_with_formatted_phone = {
            "name": "Test User 2",
            "phone": "98-7654-3210",
            "city": "Test City",
            "productInterest": "Test Product",
            "message": "Test message"
        }
        resp = requests.post(f"{BASE_URL}/inquiries", json=inquiry_with_formatted_phone, timeout=10)
        passed = resp.status_code == 201
        if passed:
            inquiry = resp.json()
            created_inquiry_ids.append(inquiry.get('id'))
            passed = inquiry.get('phone') == "9876543210"
        results.append(log_test("POST /api/inquiries with phone '98-7654-3210' strips to '9876543210'", passed,
            f"Status: {resp.status_code}, phone: {inquiry.get('phone') if passed else 'N/A'}"))
    except Exception as e:
        results.append(log_test("POST /api/inquiries phone stripping", False, f"Error: {str(e)}"))
    
    # Test 5: POST /api/inquiries - missing message (should return 400)
    try:
        invalid_inquiry = {
            "name": "Test User",
            "phone": "9876543210",
            "city": "Test City",
            "productInterest": "Test Product"
            # missing message
        }
        resp = requests.post(f"{BASE_URL}/inquiries", json=invalid_inquiry, timeout=10)
        passed = resp.status_code == 400
        results.append(log_test("POST /api/inquiries without message returns 400", passed,
            f"Status: {resp.status_code}"))
    except Exception as e:
        results.append(log_test("POST /api/inquiries message validation", False, f"Error: {str(e)}"))
    
    # Test 6: PUT /api/inquiries/{id} - change status to 'contacted'
    if created_inquiry_ids:
        try:
            update_data = {"status": "contacted"}
            resp = requests.put(f"{BASE_URL}/inquiries/{created_inquiry_ids[0]}", json=update_data, timeout=10)
            passed = resp.status_code == 200
            if passed:
                inquiry = resp.json()
                passed = inquiry.get('status') == 'contacted'
            results.append(log_test(f"PUT /api/inquiries/{created_inquiry_ids[0]} changes status to 'contacted'", passed,
                f"Status: {resp.status_code}, status: {inquiry.get('status') if passed else 'N/A'}"))
        except Exception as e:
            results.append(log_test("PUT /api/inquiries status to contacted", False, f"Error: {str(e)}"))
    
    # Test 7: PUT /api/inquiries/{id} - change status to 'converted'
    if created_inquiry_ids:
        try:
            update_data = {"status": "converted"}
            resp = requests.put(f"{BASE_URL}/inquiries/{created_inquiry_ids[0]}", json=update_data, timeout=10)
            passed = resp.status_code == 200
            if passed:
                inquiry = resp.json()
                passed = inquiry.get('status') == 'converted'
            results.append(log_test(f"PUT /api/inquiries/{created_inquiry_ids[0]} changes status to 'converted'", passed,
                f"Status: {resp.status_code}, status: {inquiry.get('status') if passed else 'N/A'}"))
        except Exception as e:
            results.append(log_test("PUT /api/inquiries status to converted", False, f"Error: {str(e)}"))
    
    # Test 8: PUT /api/inquiries/{id} - change status to 'closed'
    if created_inquiry_ids:
        try:
            update_data = {"status": "closed"}
            resp = requests.put(f"{BASE_URL}/inquiries/{created_inquiry_ids[0]}", json=update_data, timeout=10)
            passed = resp.status_code == 200
            if passed:
                inquiry = resp.json()
                passed = inquiry.get('status') == 'closed'
            results.append(log_test(f"PUT /api/inquiries/{created_inquiry_ids[0]} changes status to 'closed'", passed,
                f"Status: {resp.status_code}, status: {inquiry.get('status') if passed else 'N/A'}"))
        except Exception as e:
            results.append(log_test("PUT /api/inquiries status to closed", False, f"Error: {str(e)}"))
    
    # Test 9: PUT /api/inquiries/{id} - invalid status (should return 400)
    if created_inquiry_ids:
        try:
            update_data = {"status": "invalid_status"}
            resp = requests.put(f"{BASE_URL}/inquiries/{created_inquiry_ids[0]}", json=update_data, timeout=10)
            passed = resp.status_code == 400
            if passed:
                error = resp.json()
                passed = error.get('error') == 'Invalid status'
            results.append(log_test(f"PUT /api/inquiries/{created_inquiry_ids[0]} with invalid status returns 400", passed,
                f"Status: {resp.status_code}, Response: {resp.text[:100]}"))
        except Exception as e:
            results.append(log_test("PUT /api/inquiries invalid status", False, f"Error: {str(e)}"))
    
    # Test 10: DELETE /api/inquiries/{id} - delete all created inquiries
    for inquiry_id in created_inquiry_ids[:]:
        try:
            resp = requests.delete(f"{BASE_URL}/inquiries/{inquiry_id}", timeout=10)
            passed = resp.status_code == 200
            if passed:
                result = resp.json()
                passed = result.get('success') is True
            results.append(log_test(f"DELETE /api/inquiries/{inquiry_id} returns success:true", passed,
                f"Status: {resp.status_code}"))
        except Exception as e:
            results.append(log_test(f"DELETE /api/inquiries/{inquiry_id}", False, f"Error: {str(e)}"))
    
    created_inquiry_ids.clear()
    
    return all(results), created_inquiry_ids

def test_reviews_api():
    """Test Reviews CRUD operations"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}TESTING REVIEWS API{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}\n")
    
    results = []
    created_review_ids = []
    
    # Test 1: GET /api/reviews - should return 5 seeded reviews sorted by createdAt desc
    try:
        resp = requests.get(f"{BASE_URL}/reviews", timeout=10)
        passed = resp.status_code == 200
        if passed:
            reviews = resp.json()
            passed = isinstance(reviews, list) and len(reviews) == 5
            if passed:
                # Check if sorted by createdAt desc
                dates = [r.get('createdAt') for r in reviews]
                sorted_dates = sorted(dates, reverse=True)
                is_sorted = dates == sorted_dates
                
                # Check 3 have isFeatured:true
                featured_count = sum(1 for r in reviews if r.get('isFeatured') is True)
                
                results.append(log_test("GET /api/reviews returns 5 reviews sorted by createdAt desc, 3 featured", 
                    passed and is_sorted and featured_count == 3,
                    f"Found {len(reviews)} reviews, sorted: {is_sorted}, featured: {featured_count}"))
            else:
                results.append(log_test("GET /api/reviews returns 5 reviews", False,
                    f"Expected 5 reviews, got {len(reviews) if isinstance(reviews, list) else 'non-list'}"))
        else:
            results.append(log_test("GET /api/reviews returns 200", False, f"Status: {resp.status_code}"))
    except Exception as e:
        results.append(log_test("GET /api/reviews", False, f"Error: {str(e)}"))
    
    # Test 2: POST /api/reviews - create with valid data
    try:
        new_review = {
            "customerName": "Test Customer",
            "customerPhoto": "",
            "rating": 5,
            "reviewText": "Great service!",
            "isFeatured": False
        }
        resp = requests.post(f"{BASE_URL}/reviews", json=new_review, timeout=10)
        passed = resp.status_code == 201
        if passed:
            review = resp.json()
            review_id = review.get('id')
            created_review_ids.append(review_id)
            checks = [
                review.get('id') is not None,
                review.get('customerName') == "Test Customer",
                review.get('rating') == 5,
                review.get('reviewText') == "Great service!",
                review.get('createdAt') is not None
            ]
            passed = all(checks)
            results.append(log_test("POST /api/reviews creates review with UUID, IST createdAt, rating 5", passed,
                f"ID: {review_id}, rating: {review.get('rating')}, createdAt: {review.get('createdAt')}"))
        else:
            results.append(log_test("POST /api/reviews returns 201", False,
                f"Status: {resp.status_code}, Body: {resp.text}"))
    except Exception as e:
        results.append(log_test("POST /api/reviews", False, f"Error: {str(e)}"))
    
    # Test 3: POST /api/reviews - rating 10 should be clamped to 5
    try:
        review_high_rating = {
            "customerName": "Test Customer 2",
            "customerPhoto": "",
            "rating": 10,
            "reviewText": "Excellent!",
            "isFeatured": False
        }
        resp = requests.post(f"{BASE_URL}/reviews", json=review_high_rating, timeout=10)
        passed = resp.status_code == 201
        if passed:
            review = resp.json()
            created_review_ids.append(review.get('id'))
            passed = review.get('rating') == 5
        results.append(log_test("POST /api/reviews with rating 10 clamps to 5", passed,
            f"Status: {resp.status_code}, rating: {review.get('rating') if passed else 'N/A'}"))
    except Exception as e:
        results.append(log_test("POST /api/reviews rating clamp high", False, f"Error: {str(e)}"))
    
    # Test 4: POST /api/reviews - rating 0 should be clamped to 1
    try:
        review_low_rating = {
            "customerName": "Test Customer 3",
            "customerPhoto": "",
            "rating": 0,
            "reviewText": "Not good",
            "isFeatured": False
        }
        resp = requests.post(f"{BASE_URL}/reviews", json=review_low_rating, timeout=10)
        passed = resp.status_code == 201
        if passed:
            review = resp.json()
            created_review_ids.append(review.get('id'))
            passed = review.get('rating') == 1
        results.append(log_test("POST /api/reviews with rating 0 clamps to 1", passed,
            f"Status: {resp.status_code}, rating: {review.get('rating') if passed else 'N/A'}"))
    except Exception as e:
        results.append(log_test("POST /api/reviews rating clamp low", False, f"Error: {str(e)}"))
    
    # Test 5: POST /api/reviews - without customerName (should return 400)
    try:
        invalid_review = {
            "customerPhoto": "",
            "rating": 5,
            "reviewText": "Great!",
            "isFeatured": False
        }
        resp = requests.post(f"{BASE_URL}/reviews", json=invalid_review, timeout=10)
        passed = resp.status_code == 400
        if passed:
            error = resp.json()
            passed = error.get('error') == 'Name and review text required'
        results.append(log_test("POST /api/reviews without customerName returns 400 with 'Name and review text required'", passed,
            f"Status: {resp.status_code}, Response: {resp.text[:100]}"))
    except Exception as e:
        results.append(log_test("POST /api/reviews name validation", False, f"Error: {str(e)}"))
    
    # Test 6: POST /api/reviews - without reviewText (should return 400)
    try:
        invalid_review = {
            "customerName": "Test Customer",
            "customerPhoto": "",
            "rating": 5,
            "isFeatured": False
        }
        resp = requests.post(f"{BASE_URL}/reviews", json=invalid_review, timeout=10)
        passed = resp.status_code == 400
        results.append(log_test("POST /api/reviews without reviewText returns 400", passed,
            f"Status: {resp.status_code}"))
    except Exception as e:
        results.append(log_test("POST /api/reviews text validation", False, f"Error: {str(e)}"))
    
    # Test 7: PUT /api/reviews/{id} - toggle isFeatured to true
    if created_review_ids:
        try:
            update_data = {"isFeatured": True}
            resp = requests.put(f"{BASE_URL}/reviews/{created_review_ids[0]}", json=update_data, timeout=10)
            passed = resp.status_code == 200
            if passed:
                review = resp.json()
                passed = review.get('isFeatured') is True
            results.append(log_test(f"PUT /api/reviews/{created_review_ids[0]} toggles isFeatured to true", passed,
                f"Status: {resp.status_code}, isFeatured: {review.get('isFeatured') if passed else 'N/A'}"))
        except Exception as e:
            results.append(log_test("PUT /api/reviews toggle isFeatured", False, f"Error: {str(e)}"))
    
    # Test 8: PUT /api/reviews/{id} - update rating and reviewText
    if created_review_ids:
        try:
            update_data = {
                "rating": 3,
                "reviewText": "Updated"
            }
            resp = requests.put(f"{BASE_URL}/reviews/{created_review_ids[0]}", json=update_data, timeout=10)
            passed = resp.status_code == 200
            if passed:
                review = resp.json()
                passed = review.get('rating') == 3 and review.get('reviewText') == "Updated"
            results.append(log_test(f"PUT /api/reviews/{created_review_ids[0]} updates rating and reviewText", passed,
                f"Status: {resp.status_code}, rating: {review.get('rating') if passed else 'N/A'}"))
        except Exception as e:
            results.append(log_test("PUT /api/reviews update fields", False, f"Error: {str(e)}"))
    
    # Test 9: DELETE /api/reviews/{id} - delete review
    if created_review_ids:
        try:
            resp = requests.delete(f"{BASE_URL}/reviews/{created_review_ids[0]}", timeout=10)
            passed = resp.status_code == 200
            if passed:
                result = resp.json()
                passed = result.get('success') is True
            results.append(log_test(f"DELETE /api/reviews/{created_review_ids[0]} returns success:true", passed,
                f"Status: {resp.status_code}"))
            created_review_ids.pop(0)
        except Exception as e:
            results.append(log_test("DELETE /api/reviews/{id}", False, f"Error: {str(e)}"))
    
    # Test 10: DELETE /api/reviews/nonexistent - should return 404
    try:
        resp = requests.delete(f"{BASE_URL}/reviews/nonexistent-id-12345", timeout=10)
        passed = resp.status_code == 404
        results.append(log_test("DELETE /api/reviews/nonexistent returns 404", passed,
            f"Status: {resp.status_code}"))
    except Exception as e:
        results.append(log_test("DELETE /api/reviews/nonexistent", False, f"Error: {str(e)}"))
    
    # Cleanup remaining test reviews
    for review_id in created_review_ids[:]:
        try:
            resp = requests.delete(f"{BASE_URL}/reviews/{review_id}", timeout=10)
            if resp.status_code == 200:
                print(f"  {Colors.YELLOW}Cleaned up test review {review_id}{Colors.END}")
        except Exception as e:
            print(f"  {Colors.RED}Failed to cleanup review {review_id}: {str(e)}{Colors.END}")
    
    created_review_ids.clear()
    
    return all(results), created_review_ids

def main():
    """Run all Phase 2 backend API tests"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}SETHI PURSE PHASE 2 BACKEND API TEST SUITE{Colors.END}")
    print(f"{Colors.BLUE}Base URL: {BASE_URL}{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}")
    
    all_passed = True
    all_created_ids = []
    
    # Run all test suites
    offers_passed, offer_ids = test_offers_api()
    inquiries_passed, inquiry_ids = test_inquiries_api()
    reviews_passed, review_ids = test_reviews_api()
    
    all_passed = offers_passed and inquiries_passed and reviews_passed
    all_created_ids = offer_ids + inquiry_ids + review_ids
    
    # Final cleanup
    if all_created_ids:
        print(f"\n{Colors.YELLOW}{'='*60}{Colors.END}")
        print(f"{Colors.YELLOW}CLEANUP: Removing remaining test data{Colors.END}")
        print(f"{Colors.YELLOW}{'='*60}{Colors.END}")
        
        for item_id in all_created_ids:
            for endpoint in ['offers', 'inquiries', 'reviews']:
                try:
                    resp = requests.delete(f"{BASE_URL}/{endpoint}/{item_id}", timeout=10)
                    if resp.status_code == 200:
                        print(f"  {Colors.GREEN}✓{Colors.END} Deleted {endpoint}/{item_id}")
                        break
                except:
                    pass
    
    # Final summary
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}TEST SUMMARY{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"Offers API: {Colors.GREEN}PASS{Colors.END}" if offers_passed else f"Offers API: {Colors.RED}FAIL{Colors.END}")
    print(f"Inquiries API: {Colors.GREEN}PASS{Colors.END}" if inquiries_passed else f"Inquiries API: {Colors.RED}FAIL{Colors.END}")
    print(f"Reviews API: {Colors.GREEN}PASS{Colors.END}" if reviews_passed else f"Reviews API: {Colors.RED}FAIL{Colors.END}")
    print(f"\n{Colors.GREEN if all_passed else Colors.RED}Overall: {'ALL TESTS PASSED ✅' if all_passed else 'SOME TESTS FAILED ❌'}{Colors.END}\n")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
