#!/usr/bin/env python3
"""
Comprehensive backend API tests for SETHI PURSE
Tests all endpoints: products, categories, auth, settings
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

def test_products_api():
    """Test Products CRUD operations"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}TESTING PRODUCTS API{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}\n")
    
    results = []
    created_product_id = None
    
    # Test 1: GET /api/products - should return 8 seeded products sorted by createdAt desc
    try:
        resp = requests.get(f"{BASE_URL}/products", timeout=10)
        passed = resp.status_code == 200
        if passed:
            products = resp.json()
            passed = isinstance(products, list) and len(products) == 8
            if passed:
                # Verify sorting by createdAt desc
                dates = [p.get('createdAt') for p in products]
                sorted_dates = sorted(dates, reverse=True)
                passed = dates == sorted_dates
                results.append(log_test("GET /api/products returns 8 products sorted by createdAt desc", passed, 
                    f"Found {len(products)} products, sorted correctly: {passed}"))
            else:
                results.append(log_test("GET /api/products returns 8 products", False, 
                    f"Expected 8 products, got {len(products) if isinstance(products, list) else 'non-list'}"))
        else:
            results.append(log_test("GET /api/products returns 200", False, f"Status: {resp.status_code}"))
    except Exception as e:
        results.append(log_test("GET /api/products", False, f"Error: {str(e)}"))
    
    # Test 2: POST /api/products - create new product
    try:
        new_product = {
            "name": "Test Product",
            "brand": "Safari",
            "category": "Backpacks",
            "mrp": 1500,
            "salePrice": 999,
            "stock": 10,
            "imageUrl": "https://placehold.co/400x500"
        }
        resp = requests.post(f"{BASE_URL}/products", json=new_product, timeout=10)
        passed = resp.status_code == 201
        if passed:
            product = resp.json()
            created_product_id = product.get('id')
            checks = [
                product.get('id') is not None,
                product.get('name') == "Test Product",
                product.get('brand') == "Safari",
                product.get('category') == "Backpacks",
                product.get('salePrice') == 999,
                product.get('stock') == 10,
                product.get('imageType') == 'url',
                product.get('createdAt') is not None
            ]
            passed = all(checks)
            results.append(log_test("POST /api/products creates product with UUID, imageType, createdAt", passed,
                f"ID: {created_product_id}, imageType: {product.get('imageType')}, createdAt: {product.get('createdAt')}"))
        else:
            results.append(log_test("POST /api/products returns 201", False, 
                f"Status: {resp.status_code}, Body: {resp.text}"))
    except Exception as e:
        results.append(log_test("POST /api/products", False, f"Error: {str(e)}"))
    
    # Test 3: POST /api/products - missing required field (salePrice)
    try:
        invalid_product = {
            "name": "Invalid Product",
            "category": "Backpacks"
            # missing salePrice
        }
        resp = requests.post(f"{BASE_URL}/products", json=invalid_product, timeout=10)
        passed = resp.status_code == 400
        if passed:
            error = resp.json()
            passed = 'error' in error
        results.append(log_test("POST /api/products without salePrice returns 400", passed,
            f"Status: {resp.status_code}, Response: {resp.text[:100]}"))
    except Exception as e:
        results.append(log_test("POST /api/products validation", False, f"Error: {str(e)}"))
    
    # Test 4: POST /api/products - missing category
    try:
        invalid_product = {
            "name": "Invalid Product",
            "salePrice": 999
            # missing category
        }
        resp = requests.post(f"{BASE_URL}/products", json=invalid_product, timeout=10)
        passed = resp.status_code == 400
        results.append(log_test("POST /api/products without category returns 400", passed,
            f"Status: {resp.status_code}"))
    except Exception as e:
        results.append(log_test("POST /api/products category validation", False, f"Error: {str(e)}"))
    
    # Test 5: GET /api/products/{id} - get created product
    if created_product_id:
        try:
            resp = requests.get(f"{BASE_URL}/products/{created_product_id}", timeout=10)
            passed = resp.status_code == 200
            if passed:
                product = resp.json()
                passed = product.get('id') == created_product_id
            results.append(log_test(f"GET /api/products/{created_product_id} returns product", passed,
                f"Status: {resp.status_code}"))
        except Exception as e:
            results.append(log_test("GET /api/products/{id}", False, f"Error: {str(e)}"))
    
    # Test 6: GET /api/products/nonexistent - should return 404
    try:
        resp = requests.get(f"{BASE_URL}/products/nonexistent-id-12345", timeout=10)
        passed = resp.status_code == 404
        results.append(log_test("GET /api/products/nonexistent returns 404", passed,
            f"Status: {resp.status_code}"))
    except Exception as e:
        results.append(log_test("GET /api/products/nonexistent", False, f"Error: {str(e)}"))
    
    # Test 7: PUT /api/products/{id} - update product with stock=null
    if created_product_id:
        try:
            update_data = {
                "salePrice": 888,
                "stock": None
            }
            resp = requests.put(f"{BASE_URL}/products/{created_product_id}", json=update_data, timeout=10)
            passed = resp.status_code == 200
            if passed:
                product = resp.json()
                passed = product.get('salePrice') == 888 and product.get('stock') is None
            results.append(log_test(f"PUT /api/products/{created_product_id} updates salePrice and stock=null", passed,
                f"Status: {resp.status_code}, salePrice: {product.get('salePrice') if passed else 'N/A'}, stock: {product.get('stock') if passed else 'N/A'}"))
        except Exception as e:
            results.append(log_test("PUT /api/products/{id}", False, f"Error: {str(e)}"))
    
    # Test 8: DELETE /api/products/{id} - delete product
    if created_product_id:
        try:
            resp = requests.delete(f"{BASE_URL}/products/{created_product_id}", timeout=10)
            passed = resp.status_code == 200
            if passed:
                result = resp.json()
                passed = result.get('success') is True
            results.append(log_test(f"DELETE /api/products/{created_product_id} returns success:true", passed,
                f"Status: {resp.status_code}, Response: {resp.text[:100]}"))
            
            # Test 9: Verify product is deleted - GET should return 404
            if passed:
                resp = requests.get(f"{BASE_URL}/products/{created_product_id}", timeout=10)
                passed = resp.status_code == 404
                results.append(log_test(f"GET /api/products/{created_product_id} after DELETE returns 404", passed,
                    f"Status: {resp.status_code}"))
        except Exception as e:
            results.append(log_test("DELETE /api/products/{id}", False, f"Error: {str(e)}"))
    
    return all(results)

def test_categories_api():
    """Test Categories CRUD operations"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}TESTING CATEGORIES API{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}\n")
    
    results = []
    created_category_id = None
    
    # Test 1: GET /api/categories - should return 8 seeded categories
    try:
        resp = requests.get(f"{BASE_URL}/categories", timeout=10)
        passed = resp.status_code == 200
        if passed:
            categories = resp.json()
            passed = isinstance(categories, list) and len(categories) == 8
            results.append(log_test("GET /api/categories returns 8 categories", passed,
                f"Found {len(categories)} categories"))
        else:
            results.append(log_test("GET /api/categories returns 200", False, f"Status: {resp.status_code}"))
    except Exception as e:
        results.append(log_test("GET /api/categories", False, f"Error: {str(e)}"))
    
    # Test 2: POST /api/categories - create new category
    try:
        new_category = {
            "name": "TestCat",
            "imageUrl": "https://placehold.co/600x400"
        }
        resp = requests.post(f"{BASE_URL}/categories", json=new_category, timeout=10)
        passed = resp.status_code == 201
        if passed:
            category = resp.json()
            created_category_id = category.get('id')
            passed = category.get('name') == "TestCat" and category.get('id') is not None
            results.append(log_test("POST /api/categories creates category with UUID", passed,
                f"ID: {created_category_id}, Name: {category.get('name')}"))
        else:
            results.append(log_test("POST /api/categories returns 201", False,
                f"Status: {resp.status_code}, Body: {resp.text}"))
    except Exception as e:
        results.append(log_test("POST /api/categories", False, f"Error: {str(e)}"))
    
    # Test 3: POST /api/categories - duplicate name should fail
    try:
        duplicate_category = {
            "name": "TestCat",  # Same name as above
            "imageUrl": "https://placehold.co/600x400"
        }
        resp = requests.post(f"{BASE_URL}/categories", json=duplicate_category, timeout=10)
        passed = resp.status_code == 400
        if passed:
            error = resp.json()
            passed = 'error' in error
        results.append(log_test("POST /api/categories with duplicate name returns 400", passed,
            f"Status: {resp.status_code}, Response: {resp.text[:100]}"))
    except Exception as e:
        results.append(log_test("POST /api/categories duplicate check", False, f"Error: {str(e)}"))
    
    # Test 4: PUT /api/categories/{id} - update category
    if created_category_id:
        try:
            update_data = {
                "name": "TestCat2"
            }
            resp = requests.put(f"{BASE_URL}/categories/{created_category_id}", json=update_data, timeout=10)
            passed = resp.status_code == 200
            if passed:
                category = resp.json()
                passed = category.get('name') == "TestCat2"
            results.append(log_test(f"PUT /api/categories/{created_category_id} updates name", passed,
                f"Status: {resp.status_code}, Name: {category.get('name') if passed else 'N/A'}"))
        except Exception as e:
            results.append(log_test("PUT /api/categories/{id}", False, f"Error: {str(e)}"))
    
    # Test 5: DELETE /api/categories/{id} - delete category
    if created_category_id:
        try:
            resp = requests.delete(f"{BASE_URL}/categories/{created_category_id}", timeout=10)
            passed = resp.status_code == 200
            if passed:
                result = resp.json()
                passed = result.get('success') is True
            results.append(log_test(f"DELETE /api/categories/{created_category_id} returns success:true", passed,
                f"Status: {resp.status_code}"))
        except Exception as e:
            results.append(log_test("DELETE /api/categories/{id}", False, f"Error: {str(e)}"))
    
    return all(results)

def test_auth_api():
    """Test Auth API operations"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}TESTING AUTH API{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}\n")
    
    results = []
    
    # Test 1: POST /api/auth/login - successful login
    try:
        login_data = {
            "username": "admin",
            "password": "sethi2024"
        }
        resp = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
        passed = resp.status_code == 200
        if passed:
            result = resp.json()
            passed = result.get('success') is True and 'token' in result
            results.append(log_test("POST /api/auth/login with correct credentials returns token", passed,
                f"Status: {resp.status_code}, success: {result.get('success')}, token present: {'token' in result}"))
        else:
            results.append(log_test("POST /api/auth/login returns 200", False,
                f"Status: {resp.status_code}, Body: {resp.text}"))
    except Exception as e:
        results.append(log_test("POST /api/auth/login success", False, f"Error: {str(e)}"))
    
    # Test 2: POST /api/auth/login - wrong password
    try:
        login_data = {
            "username": "admin",
            "password": "wrongpassword"
        }
        resp = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
        passed = resp.status_code == 401
        if passed:
            result = resp.json()
            passed = result.get('error') == 'Invalid credentials'
        results.append(log_test("POST /api/auth/login with wrong password returns 401", passed,
            f"Status: {resp.status_code}, Response: {resp.text[:100]}"))
    except Exception as e:
        results.append(log_test("POST /api/auth/login failure", False, f"Error: {str(e)}"))
    
    # Test 3: POST /api/auth/logout
    try:
        resp = requests.post(f"{BASE_URL}/auth/logout", timeout=10)
        passed = resp.status_code == 200
        if passed:
            result = resp.json()
            passed = result.get('success') is True
        results.append(log_test("POST /api/auth/logout returns success:true", passed,
            f"Status: {resp.status_code}"))
    except Exception as e:
        results.append(log_test("POST /api/auth/logout", False, f"Error: {str(e)}"))
    
    return all(results)

def test_settings_api():
    """Test Settings API operations"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}TESTING SETTINGS API{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}\n")
    
    results = []
    
    # Test 1: GET /api/settings - should return username only (no password)
    try:
        resp = requests.get(f"{BASE_URL}/settings", timeout=10)
        passed = resp.status_code == 200
        if passed:
            settings = resp.json()
            passed = settings.get('username') == 'admin' and 'password' not in settings
            results.append(log_test("GET /api/settings returns username without password", passed,
                f"Status: {resp.status_code}, username: {settings.get('username')}, password exposed: {'password' in settings}"))
        else:
            results.append(log_test("GET /api/settings returns 200", False, f"Status: {resp.status_code}"))
    except Exception as e:
        results.append(log_test("GET /api/settings", False, f"Error: {str(e)}"))
    
    # Test 2: PUT /api/settings - change password with wrong currentPassword
    try:
        change_data = {
            "action": "change-password",
            "currentPassword": "wrongpassword",
            "newPassword": "newpass123",
            "confirmPassword": "newpass123"
        }
        resp = requests.put(f"{BASE_URL}/settings", json=change_data, timeout=10)
        passed = resp.status_code == 400
        if passed:
            error = resp.json()
            passed = 'error' in error
        results.append(log_test("PUT /api/settings change-password with wrong currentPassword returns 400", passed,
            f"Status: {resp.status_code}, Response: {resp.text[:100]}"))
    except Exception as e:
        results.append(log_test("PUT /api/settings wrong password", False, f"Error: {str(e)}"))
    
    # Test 3: PUT /api/settings - change password with mismatched confirm
    try:
        change_data = {
            "action": "change-password",
            "currentPassword": "sethi2024",
            "newPassword": "newpass123",
            "confirmPassword": "differentpass"
        }
        resp = requests.put(f"{BASE_URL}/settings", json=change_data, timeout=10)
        passed = resp.status_code == 400
        results.append(log_test("PUT /api/settings change-password with mismatched confirm returns 400", passed,
            f"Status: {resp.status_code}"))
    except Exception as e:
        results.append(log_test("PUT /api/settings mismatch confirm", False, f"Error: {str(e)}"))
    
    # Test 4: PUT /api/settings - change password with short password
    try:
        change_data = {
            "action": "change-password",
            "currentPassword": "sethi2024",
            "newPassword": "short",
            "confirmPassword": "short"
        }
        resp = requests.put(f"{BASE_URL}/settings", json=change_data, timeout=10)
        passed = resp.status_code == 400
        results.append(log_test("PUT /api/settings change-password with password < 6 chars returns 400", passed,
            f"Status: {resp.status_code}"))
    except Exception as e:
        results.append(log_test("PUT /api/settings short password", False, f"Error: {str(e)}"))
    
    # Test 5: PUT /api/settings - change password successfully
    try:
        change_data = {
            "action": "change-password",
            "currentPassword": "sethi2024",
            "newPassword": "newpass123",
            "confirmPassword": "newpass123"
        }
        resp = requests.put(f"{BASE_URL}/settings", json=change_data, timeout=10)
        passed = resp.status_code == 200
        if passed:
            result = resp.json()
            passed = result.get('success') is True
        results.append(log_test("PUT /api/settings change-password succeeds", passed,
            f"Status: {resp.status_code}"))
    except Exception as e:
        results.append(log_test("PUT /api/settings change password", False, f"Error: {str(e)}"))
    
    # Test 6: Verify login with new password works
    try:
        login_data = {
            "username": "admin",
            "password": "newpass123"
        }
        resp = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
        passed = resp.status_code == 200 and resp.json().get('success') is True
        results.append(log_test("Login with new password (newpass123) works", passed,
            f"Status: {resp.status_code}"))
    except Exception as e:
        results.append(log_test("Login with new password", False, f"Error: {str(e)}"))
    
    # Test 7: Verify login with old password fails
    try:
        login_data = {
            "username": "admin",
            "password": "sethi2024"
        }
        resp = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
        passed = resp.status_code == 401
        results.append(log_test("Login with old password (sethi2024) fails", passed,
            f"Status: {resp.status_code}"))
    except Exception as e:
        results.append(log_test("Login with old password", False, f"Error: {str(e)}"))
    
    # Test 8: PUT /api/settings - change username
    try:
        change_data = {
            "action": "change-username",
            "newUsername": "sethiadmin",
            "currentPassword": "newpass123"
        }
        resp = requests.put(f"{BASE_URL}/settings", json=change_data, timeout=10)
        passed = resp.status_code == 200
        if passed:
            result = resp.json()
            passed = result.get('success') is True and result.get('username') == 'sethiadmin'
        results.append(log_test("PUT /api/settings change-username succeeds", passed,
            f"Status: {resp.status_code}"))
    except Exception as e:
        results.append(log_test("PUT /api/settings change username", False, f"Error: {str(e)}"))
    
    # Test 9: Verify login with new username works
    try:
        login_data = {
            "username": "sethiadmin",
            "password": "newpass123"
        }
        resp = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
        passed = resp.status_code == 200 and resp.json().get('success') is True
        results.append(log_test("Login with new username (sethiadmin) works", passed,
            f"Status: {resp.status_code}"))
    except Exception as e:
        results.append(log_test("Login with new username", False, f"Error: {str(e)}"))
    
    # IMPORTANT: Restore default credentials
    print(f"\n{Colors.YELLOW}Restoring default credentials (admin/sethi2024)...{Colors.END}")
    
    # Step 1: Change username back to admin
    try:
        change_data = {
            "action": "change-username",
            "newUsername": "admin",
            "currentPassword": "newpass123"
        }
        resp = requests.put(f"{BASE_URL}/settings", json=change_data, timeout=10)
        passed = resp.status_code == 200
        results.append(log_test("Restore username to 'admin'", passed,
            f"Status: {resp.status_code}"))
    except Exception as e:
        results.append(log_test("Restore username", False, f"Error: {str(e)}"))
    
    # Step 2: Change password back to sethi2024
    try:
        change_data = {
            "action": "change-password",
            "currentPassword": "newpass123",
            "newPassword": "sethi2024",
            "confirmPassword": "sethi2024"
        }
        resp = requests.put(f"{BASE_URL}/settings", json=change_data, timeout=10)
        passed = resp.status_code == 200
        results.append(log_test("Restore password to 'sethi2024'", passed,
            f"Status: {resp.status_code}"))
    except Exception as e:
        results.append(log_test("Restore password", False, f"Error: {str(e)}"))
    
    # Step 3: Verify default credentials work
    try:
        login_data = {
            "username": "admin",
            "password": "sethi2024"
        }
        resp = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
        passed = resp.status_code == 200 and resp.json().get('success') is True
        results.append(log_test("Verify default credentials (admin/sethi2024) restored", passed,
            f"Status: {resp.status_code}"))
    except Exception as e:
        results.append(log_test("Verify default credentials", False, f"Error: {str(e)}"))
    
    return all(results)

def main():
    """Run all backend API tests"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}SETHI PURSE BACKEND API TEST SUITE{Colors.END}")
    print(f"{Colors.BLUE}Base URL: {BASE_URL}{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}")
    
    all_passed = True
    
    # Run all test suites
    products_passed = test_products_api()
    categories_passed = test_categories_api()
    auth_passed = test_auth_api()
    settings_passed = test_settings_api()
    
    all_passed = products_passed and categories_passed and auth_passed and settings_passed
    
    # Final summary
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}TEST SUMMARY{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"Products API: {Colors.GREEN}PASS{Colors.END}" if products_passed else f"Products API: {Colors.RED}FAIL{Colors.END}")
    print(f"Categories API: {Colors.GREEN}PASS{Colors.END}" if categories_passed else f"Categories API: {Colors.RED}FAIL{Colors.END}")
    print(f"Auth API: {Colors.GREEN}PASS{Colors.END}" if auth_passed else f"Auth API: {Colors.RED}FAIL{Colors.END}")
    print(f"Settings API: {Colors.GREEN}PASS{Colors.END}" if settings_passed else f"Settings API: {Colors.RED}FAIL{Colors.END}")
    print(f"\n{Colors.GREEN if all_passed else Colors.RED}Overall: {'ALL TESTS PASSED ✅' if all_passed else 'SOME TESTS FAILED ❌'}{Colors.END}\n")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
