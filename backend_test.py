#!/usr/bin/env python3
"""
Backend API Testing for FinanceWise App
Tests UPI Payment APIs and other backend endpoints
"""

import requests
import json
import sys
from datetime import datetime
import uuid

# Configuration
BACKEND_URL = "https://finapp-refactor.preview.emergentagent.com/api"
TEST_USER_ID = "test_user_123"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.ENDC}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.ENDC}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.ENDC}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.ENDC}")

def print_header(message):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{message}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")

def test_endpoint(method, endpoint, data=None, expected_status=200, description=""):
    """Generic function to test API endpoints"""
    url = f"{BACKEND_URL}{endpoint}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, timeout=10)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, timeout=10)
        elif method.upper() == "PUT":
            response = requests.put(url, json=data, timeout=10)
        elif method.upper() == "DELETE":
            response = requests.delete(url, timeout=10)
        else:
            print_error(f"Unsupported method: {method}")
            return False, None
        
        if response.status_code == expected_status:
            print_success(f"{method} {endpoint} - {description}")
            try:
                return True, response.json()
            except:
                return True, response.text
        else:
            print_error(f"{method} {endpoint} - Expected {expected_status}, got {response.status_code}")
            print_error(f"Response: {response.text}")
            return False, None
            
    except requests.exceptions.RequestException as e:
        print_error(f"{method} {endpoint} - Connection error: {str(e)}")
        return False, None
    except Exception as e:
        print_error(f"{method} {endpoint} - Error: {str(e)}")
        return False, None

def test_health_check():
    """Test basic health endpoints"""
    print_header("HEALTH CHECK TESTS")
    
    success, data = test_endpoint("GET", "/", description="Root endpoint")
    if success and data:
        print_info(f"API Message: {data.get('message', 'N/A')}")
    
    success, data = test_endpoint("GET", "/health", description="Health check")
    if success and data:
        print_info(f"Status: {data.get('status', 'N/A')}")
    
    return success

def test_upi_endpoints():
    """Test UPI Payment APIs"""
    print_header("UPI PAYMENT API TESTS")
    
    results = {
        "linked_accounts": False,
        "recent_payees": False,
        "send_money": False,
        "transaction_history": False
    }
    
    # Test 1: GET /api/upi/linked-accounts/{user_id}
    print_info("Testing UPI Linked Accounts...")
    success, data = test_endpoint("GET", f"/upi/linked-accounts/{TEST_USER_ID}", 
                                description="Get UPI linked bank accounts")
    if success and data:
        results["linked_accounts"] = True
        print_info(f"UPI ID: {data.get('upi_id', 'N/A')}")
        accounts = data.get('linked_accounts', [])
        print_info(f"Found {len(accounts)} linked accounts")
        for acc in accounts[:2]:  # Show first 2
            print_info(f"  - {acc.get('bank', 'N/A')}: ₹{acc.get('balance', 0):,}")
        daily_limit = data.get('daily_limit', 0)
        used_today = data.get('used_today', 0)
        print_info(f"Daily Limit: ₹{used_today:,} / ₹{daily_limit:,}")
    
    # Test 2: GET /api/upi/recent-payees/{user_id}
    print_info("\nTesting UPI Recent Payees...")
    success, data = test_endpoint("GET", f"/upi/recent-payees/{TEST_USER_ID}",
                                description="Get recent payees")
    if success and data:
        results["recent_payees"] = True
        print_info(f"Found {len(data)} recent payees")
        for payee in data[:3]:  # Show first 3
            print_info(f"  - {payee.get('name', 'N/A')} ({payee.get('upi_id', 'N/A')}): {payee.get('last_paid', 'N/A')}")
    
    # Test 3: POST /api/upi/send-money
    print_info("\nTesting UPI Send Money...")
    send_money_data = {
        "user_id": TEST_USER_ID,
        "recipient_upi": "rahul@paytm",
        "amount": 500,
        "note": "test payment",
        "source_account": "upi_1"
    }
    success, data = test_endpoint("POST", "/upi/send-money", data=send_money_data,
                                description="Send money via UPI")
    if success and data:
        results["send_money"] = True
        print_info(f"Transaction ID: {data.get('transaction_id', 'N/A')}")
        print_info(f"Status: {data.get('status', 'N/A')}")
        print_info(f"Coins Earned: {data.get('coins_earned', 0)}")
        print_info(f"Recipient: {data.get('recipient', 'N/A')}")
    
    # Test 4: GET /api/upi/transaction-history/{user_id}
    print_info("\nTesting UPI Transaction History...")
    success, data = test_endpoint("GET", f"/upi/transaction-history/{TEST_USER_ID}",
                                description="Get UPI transaction history")
    if success and data:
        results["transaction_history"] = True
        print_info(f"Found {len(data)} transactions")
        for txn in data[:3]:  # Show first 3
            txn_type = txn.get('type', 'N/A')
            amount = txn.get('amount', 0)
            recipient = txn.get('to', txn.get('from', 'N/A'))
            status = txn.get('status', 'N/A')
            print_info(f"  - {txn_type.upper()}: ₹{amount} to {recipient} ({status})")
    
    return results

def test_debt_analysis():
    """Test debt analysis endpoints"""
    print_header("DEBT ANALYSIS TESTS")
    
    # Test debt analysis endpoint
    success, data = test_endpoint("GET", f"/debts/analysis/{TEST_USER_ID}?extra_payment=2000",
                                description="Debt analysis with extra payment")
    if success and data:
        print_info(f"Total Debt: ₹{data.get('total_debt', 0):,}")
        print_info(f"Total EMI: ₹{data.get('total_emi', 0):,}")
        
        snowball = data.get('snowball_analysis', {})
        avalanche = data.get('avalanche_analysis', {})
        
        if snowball:
            print_info(f"Snowball Strategy: {snowball.get('total_months', 0)} months, ₹{snowball.get('total_interest', 0):,} interest")
        if avalanche:
            print_info(f"Avalanche Strategy: {avalanche.get('total_months', 0)} months, ₹{avalanche.get('total_interest', 0):,} interest")
        
        interest_saved = data.get('interest_saved_with_avalanche', 0)
        print_info(f"Interest Saved with Avalanche: ₹{interest_saved:,}")
        
        return True
    return False

def test_ai_insights():
    """Test AI-powered insights"""
    print_header("AI INSIGHTS TESTS")
    
    success, data = test_endpoint("GET", f"/analytics/insights/{TEST_USER_ID}",
                                description="AI-powered financial insights")
    if success and data:
        print_info(f"Generated {len(data)} insights")
        for insight in data:
            title = insight.get('title', 'N/A')
            category = insight.get('category', 'N/A')
            impact = insight.get('impact_amount')
            print_info(f"  - {title} ({category})" + (f" - Save ₹{impact:,.0f}" if impact else ""))
        return True
    return False

def test_user_profile():
    """Test user profile endpoints"""
    print_header("USER PROFILE TESTS")
    
    results = {
        "get_user": False,
        "update_user": False,
        "security_settings": False,
        "linked_accounts": False
    }
    
    # Test get user
    success, data = test_endpoint("GET", f"/users/{TEST_USER_ID}",
                                description="Get user profile")
    if success and data:
        results["get_user"] = True
        print_info(f"User: {data.get('name', 'N/A')} ({data.get('phone', 'N/A')})")
    
    # Test update user
    update_data = {"name": "Test User Updated", "monthly_income": 75000}
    success, data = test_endpoint("PUT", f"/users/{TEST_USER_ID}", data=update_data,
                                description="Update user profile")
    if success:
        results["update_user"] = True
    
    # Test security settings
    success, data = test_endpoint("GET", f"/users/{TEST_USER_ID}/security",
                                description="Get security settings")
    if success and data:
        results["security_settings"] = True
        print_info(f"Biometric: {data.get('biometric_enabled', False)}")
        print_info(f"Transaction Alerts: {data.get('transaction_alerts', False)}")
    
    # Test linked accounts
    success, data = test_endpoint("GET", f"/users/{TEST_USER_ID}/linked-accounts",
                                description="Get linked accounts")
    if success and data:
        results["linked_accounts"] = True
        print_info(f"Found {len(data)} linked accounts")
    
    return results

def run_comprehensive_tests():
    """Run all backend tests"""
    print_header("FINANCEWISE BACKEND API TESTING")
    print_info(f"Testing Backend URL: {BACKEND_URL}")
    print_info(f"Test User ID: {TEST_USER_ID}")
    print_info(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    all_results = {
        "health_check": False,
        "upi_endpoints": {},
        "debt_analysis": False,
        "ai_insights": False,
        "user_profile": {}
    }
    
    # Run tests
    all_results["health_check"] = test_health_check()
    all_results["upi_endpoints"] = test_upi_endpoints()
    all_results["debt_analysis"] = test_debt_analysis()
    all_results["ai_insights"] = test_ai_insights()
    all_results["user_profile"] = test_user_profile()
    
    # Summary
    print_header("TEST RESULTS SUMMARY")
    
    # Health Check
    if all_results["health_check"]:
        print_success("Health Check: PASSED")
    else:
        print_error("Health Check: FAILED")
    
    # UPI Endpoints
    upi_results = all_results["upi_endpoints"]
    upi_passed = sum(1 for v in upi_results.values() if v)
    upi_total = len(upi_results)
    
    if upi_passed == upi_total:
        print_success(f"UPI Endpoints: ALL PASSED ({upi_passed}/{upi_total})")
    else:
        print_error(f"UPI Endpoints: SOME FAILED ({upi_passed}/{upi_total})")
        for endpoint, status in upi_results.items():
            status_icon = "✅" if status else "❌"
            print(f"  {status_icon} {endpoint}")
    
    # Debt Analysis
    if all_results["debt_analysis"]:
        print_success("Debt Analysis: PASSED")
    else:
        print_error("Debt Analysis: FAILED")
    
    # AI Insights
    if all_results["ai_insights"]:
        print_success("AI Insights: PASSED")
    else:
        print_error("AI Insights: FAILED")
    
    # User Profile
    profile_results = all_results["user_profile"]
    profile_passed = sum(1 for v in profile_results.values() if v)
    profile_total = len(profile_results)
    
    if profile_passed == profile_total:
        print_success(f"User Profile: ALL PASSED ({profile_passed}/{profile_total})")
    else:
        print_warning(f"User Profile: SOME FAILED ({profile_passed}/{profile_total})")
    
    # Overall Status
    critical_tests = [
        all_results["health_check"],
        all(upi_results.values()),
        all_results["debt_analysis"]
    ]
    
    if all(critical_tests):
        print_success("\n🎉 ALL CRITICAL TESTS PASSED!")
        return True
    else:
        print_error("\n💥 SOME CRITICAL TESTS FAILED!")
        return False

if __name__ == "__main__":
    success = run_comprehensive_tests()
    sys.exit(0 if success else 1)