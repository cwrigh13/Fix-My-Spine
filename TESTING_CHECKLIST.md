# FixMySpine Application Testing Checklist

## Overview
This checklist covers comprehensive testing of the FixMySpine healthcare professional directory application. Test each section thoroughly and check off items as completed.

## Prerequisites
- [ ] Application is running on `http://localhost:3000`
- [ ] Browser developer tools are open (F12) to monitor console errors
- [ ] Test on multiple screen sizes (mobile, tablet, desktop)

---

## 1. User Registration Form Testing (`/register`)

### Valid Registration Tests
- [ ] **Complete valid registration**
  - Name: `John Smith`
  - Email: `john.smith@example.com`
  - Password: `securepass123`
  - Confirm Password: `securepass123`
  - Expected: Success redirect to login page

### Validation Error Tests
- [ ] **Empty fields validation**
  - Leave all fields empty and submit
  - Expected: "All fields are required" error message

- [ ] **Invalid email format**
  - Email: `test@` or `@domain.com` or `test.domain.com`
  - Expected: "Please enter a valid email address" error message

- [ ] **Password too short**
  - Password: `12345` (less than 6 characters)
  - Expected: "Password must be at least 6 characters long" error message

- [ ] **Password mismatch**
  - Password: `securepass123`
  - Confirm Password: `differentpass`
  - Expected: "Passwords do not match" error message

- [ ] **Duplicate email**
  - Try registering with an existing email
  - Expected: "An account with this email already exists" error message

### Form Behavior Tests
- [ ] **Form data persistence on error**
  - Submit invalid data, verify name and email fields retain values
- [ ] **Success message display**
  - After successful registration, check login page shows success message

---

## 2. User Login Form Testing (`/login`)

### Valid Login Tests
- [ ] **Valid credentials**
  - Email: `john.smith@example.com`
  - Password: `securepass123`
  - Expected: Redirect to dashboard

- [ ] **Admin user login**
  - Login with admin credentials
  - Expected: Redirect to admin dashboard

### Invalid Login Tests
- [ ] **Empty fields**
  - Submit empty form
  - Expected: "Email and password are required" error message

- [ ] **Non-existent email**
  - Email: `nonexistent@example.com`
  - Password: `anypassword`
  - Expected: "Invalid email or password" error message

- [ ] **Wrong password**
  - Email: `john.smith@example.com`
  - Password: `wrongpassword`
  - Expected: "Invalid email or password" error message

### Form Behavior Tests
- [ ] **Email field persistence**
  - Submit invalid login, verify email field retains value
- [ ] **Registration success message**
  - After registration, login page should show success message

---

## 3. Business Listing Submission Form Testing (`/dashboard/submit`)

### Valid Submission Tests
- [ ] **Complete valid listing**
  - Business Name: `Sydney Chiropractic Clinic`
  - Category: Select any category
  - Location: Select any location
  - Address: `123 George Street, Sydney NSW 2000`
  - Phone: `(02) 9123 4567`
  - Website: `https://www.sydney-chiro.com.au`
  - Description: `Professional chiropractic services for back pain, neck pain, and sports injuries.`
  - Listing Tier: `Free` or `Premium`
  - Expected: Success message and redirect to dashboard

### Validation Error Tests
- [ ] **Missing required fields**
  - Leave business name, category, or location empty
  - Expected: "Business name, category, and location are required" error message

- [ ] **Invalid website URL**
  - Website: `invalid-url` or `ftp://example.com`
  - Expected: Browser validation error or form rejection

### Form Behavior Tests
- [ ] **Form data persistence on error**
  - Submit invalid data, verify all fields retain values
- [ ] **Dropdown population**
  - Verify categories and locations load correctly
- [ ] **Tier information display**
  - Check that tier benefits are shown correctly

---

## 4. Search Functionality Testing (`/search`)

### Search Form Tests
- [ ] **Empty search**
  - Submit empty search form
  - Expected: Show all available listings

- [ ] **Keyword search**
  - Keyword: `back pain`
  - Expected: Results filtered by keyword

- [ ] **Category filter**
  - Select specific category
  - Expected: Results filtered by category

- [ ] **Postcode filter**
  - Postcode: `2000`
  - Expected: Results filtered by postcode

- [ ] **Combined filters**
  - Keyword: `chiropractor`
  - Category: `Chiropractor`
  - Postcode: `2000`
  - Expected: Results match all criteria

### Validation Tests
- [ ] **Invalid postcode format**
  - Postcode: `123` or `12345` or `abcd`
  - Expected: Browser validation error (4 digits required)

### Search Results Tests
- [ ] **Results display**
  - Verify listings show correctly with all information
- [ ] **Premium listing highlighting**
  - Check premium listings have special styling/crown icon
- [ ] **Google ratings display**
  - Verify Google ratings show when available
- [ ] **No results handling**
  - Search for non-existent criteria
  - Expected: "No practitioners found" message with helpful links

---

## 5. Responsive Design Testing

### Mobile Testing (320px - 768px)
- [ ] **Navigation menu**
  - Hamburger menu appears and functions
  - Menu icon animates (hamburger ↔ X)
  - Menu overlay works correctly
  - Touch interactions are responsive

- [ ] **Form layouts**
  - Form fields stack vertically
  - Buttons are touch-friendly size
  - Input fields are properly sized

- [ ] **Search results**
  - Cards stack vertically
  - Text is readable
  - Buttons are accessible

### Tablet Testing (768px - 1024px)
- [ ] **Navigation behavior**
  - Menu adapts appropriately
  - Grid layouts adjust correctly

- [ ] **Form arrangements**
  - Multi-column forms adapt
  - Spacing remains appropriate

### Desktop Testing (1024px+)
- [ ] **Full navigation**
  - All menu items visible
  - Hover effects work
  - Multi-column layouts display correctly

---

## 6. JavaScript Functionality Testing

### Search Bar Interactions
- [ ] **Modern search field behavior**
  - Click on search field focuses input
  - Input click doesn't trigger field click
  - Text input adds `has-value` class when typing

### Admin Dashboard JavaScript
- [ ] **Login time display**
  - Current time shows correctly
- [ ] **Last activity updates**
  - Updates every minute automatically
- [ ] **Bootstrap components**
  - Dropdown menus work
  - Card hover effects function

### Billing Management JavaScript
- [ ] **Upgrade to premium function**
  - `upgradeToPremium()` works correctly
  - Stripe integration calls succeed
- [ ] **Subscription status checking**
  - `checkSubscriptionStatus()` displays correct info
- [ ] **Error handling**
  - Network failures handled gracefully
  - User-friendly error messages shown

---

## 7. Error Handling and Validation Testing

### Form Validation Errors
- [ ] **Server-side validation**
  - Error messages display correctly
  - Styling is consistent
  - Form data persists on error

- [ ] **Client-side validation**
  - HTML5 validation works
  - Browser error messages are helpful

### Authentication Errors
- [ ] **Invalid login attempts**
  - Error messages are clear
  - No sensitive information leaked
- [ ] **Session handling**
  - Session expiration handled gracefully
  - Unauthorized access blocked

### Database Errors
- [ ] **Connection failures**
  - Error pages display correctly
  - User-friendly messages shown
- [ ] **Constraint violations**
  - Duplicate data handled properly
  - Clear error messages provided

---

## 8. Payment and Subscription Workflow Testing

### Premium Upgrade Flow
- [ ] **Payment session creation**
  - Stripe session created successfully
  - User redirected to payment page
- [ ] **Payment success handling**
  - Webhook processes correctly
  - Database updates properly
  - User redirected with success message
- [ ] **Payment failure handling**
  - Errors handled gracefully
  - User notified appropriately

### Billing Management
- [ ] **Subscription status display**
  - Current status shows correctly
  - Expiry dates calculated properly
- [ ] **Payment method updates**
  - Stripe portal integration works
- [ ] **Subscription reactivation**
  - Cancelled subscriptions can be reactivated

---

## 9. Admin Dashboard Testing

### Admin Authentication
- [ ] **Admin login**
  - Admin users can access dashboard
  - Non-admin users blocked
- [ ] **Session management**
  - Admin sessions work correctly
  - Logout functions properly

### Content Management
- [ ] **User management**
  - User list displays correctly
  - User actions work (if implemented)
- [ ] **Listing management**
  - Listings show with correct status
  - Approval/rejection functions work
- [ ] **Category and location management**
  - CRUD operations work correctly
- [ ] **Google ratings integration**
  - Ratings update correctly
  - Display shows properly

---

## 10. Console Error Monitoring

### JavaScript Errors to Watch For
- [ ] **No undefined variables**
- [ ] **No missing DOM elements**
- [ ] **No network request failures**
- [ ] **No Stripe integration errors**
- [ ] **No Bootstrap component errors**
- [ ] **No event listener conflicts**

### Network Errors to Monitor
- [ ] **CSS/JS files load successfully**
- [ ] **Stripe API connections work**
- [ ] **Database connections stable**
- [ ] **Images load correctly**

---

## 11. Performance and SEO Testing

### Page Load Performance
- [ ] **Initial page load times**
  - Homepage loads quickly
  - Search results load efficiently
  - Dashboard loads promptly
- [ ] **Resource optimization**
  - Images are optimized
  - CSS/JS are minified
  - Database queries are efficient

### SEO Elements
- [ ] **Meta tags**
  - Title tags are present and unique
  - Meta descriptions are appropriate
  - Open Graph tags are correct
- [ ] **Structured data**
  - Schema markup is valid
- [ ] **Sitemap generation**
  - Sitemap updates correctly
  - Canonical URLs are set

---

## 12. Security Testing

### Input Sanitization
- [ ] **XSS prevention**
  - Script tags are escaped
  - User input is sanitized
- [ ] **SQL injection protection**
  - Parameterized queries used
  - No raw SQL concatenation
- [ ] **CSRF protection**
  - Tokens are validated
  - Forms are protected

### Authentication Security
- [ ] **Password security**
  - Passwords are hashed (bcrypt)
  - No plain text storage
- [ ] **Session security**
  - Sessions are secure
  - Proper logout handling
- [ ] **Admin access controls**
  - Admin routes protected
  - Proper authorization checks

---

## Test Data Reference

### Registration Test User
```
Name: Test User
Email: test@example.com
Password: testpass123
Confirm Password: testpass123
```

### Business Listing Test Data
```
Business Name: Test Chiropractic Clinic
Category: Chiropractor
Location: Sydney, NSW 2000
Address: 123 Test Street
Phone: (02) 1234 5678
Website: https://test-clinic.com.au
Description: Test business description
Listing Tier: Free
```

### Search Test Scenarios
```
Keyword: back pain
Category: Chiropractor
Postcode: 2000

Keyword: sports injury
Category: Physiotherapist
Postcode: 3000
```

---

## Testing Notes

- **Browser Compatibility**: Test in Chrome, Firefox, Safari, and Edge
- **Mobile Devices**: Test on actual devices when possible
- **Network Conditions**: Test with slow connections
- **Accessibility**: Check with screen readers and keyboard navigation
- **Cross-browser**: Verify consistent behavior across browsers

## Completion Checklist

- [ ] All registration tests completed
- [ ] All login tests completed
- [ ] All listing submission tests completed
- [ ] All search functionality tests completed
- [ ] All responsive design tests completed
- [ ] All JavaScript functionality tests completed
- [ ] All error handling tests completed
- [ ] All payment workflow tests completed
- [ ] All admin dashboard tests completed
- [ ] All console error monitoring completed
- [ ] All performance tests completed
- [ ] All security tests completed

**Total Items Completed:** ___ / ___

**Testing Date:** ___________

**Tester Name:** ___________

**Notes:** ___________
