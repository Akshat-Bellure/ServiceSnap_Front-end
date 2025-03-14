/*************************************************************
 * script.js (Final Enhanced)
 *
 * - District & Area selection on signup
 * - AI matching by lat/lng
 * - SOS button (simulated)
 * - Favorites (♥) for customers
 * - Photo verification & pre-approval (simulateExtraRepair)
 * - Escrow + platform fee concept in "completed" status
 * - Loyalty points for customers upon completion
 * - Scam reporting (reportScam) => provider gets scamCount++
 * - Provider delisted if scamCount >= 2 or rating < 2.0
 * - All data stored in localStorage
 *************************************************************/

/*************************************************************
 * Helper: get & set arrays in localStorage
 *************************************************************/
function getArray(key) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}
function setArray(key, arr) {
  localStorage.setItem(key, JSON.stringify(arr));
}

/*************************************************************
 * Nav, Greeting, Logout
 *************************************************************/
function buildNav() {
  const navLinks = document.getElementById("navLinks");
  const userGreeting = document.getElementById("userGreeting");
  const currentUserStr = localStorage.getItem("currentUser");
  let isLoggedIn = false;
  let userName = "";

  if (currentUserStr) {
    const user = JSON.parse(currentUserStr);
    isLoggedIn = true;
    userName = user.name;
  }

  let html = `
    <a href="index.html"><i class="fas fa-home"></i> Home</a>
    <a href="book-service.html"><i class="fas fa-book"></i> Book Service</a>
    <a href="my-bookings.html"><i class="fas fa-clipboard-list"></i> My Bookings</a>
    <a href="provider-dashboard.html"><i class="fas fa-user-cog"></i> Provider Dashboard</a>
    <a href="reviews.html"><i class="fas fa-star"></i> Reviews</a>
  `;

  if (!isLoggedIn) {
    html += `
      <a href="login.html"><i class="fas fa-sign-in-alt"></i> Log In</a>
      <a href="signup.html"><i class="fas fa-user-plus"></i> Sign Up</a>
    `;
    if (userGreeting) userGreeting.textContent = "";
  } else {
    html += `
      <a href="#" onclick="logoutUser()"><i class="fas fa-sign-out-alt"></i> Log Out</a>
    `;
    if (userGreeting) {
      userGreeting.textContent = "Hello, " + userName;
    }
  }

  if (navLinks) {
    navLinks.innerHTML = html;
  }
}

function logoutUser() {
  localStorage.removeItem("currentUser");
  alert("Logged out successfully!");
  window.location.href = "index.html";
}

/*************************************************************
 * SOS: simulate phone & location
 *************************************************************/
function triggerSOS() {
  const currentUserStr = localStorage.getItem("currentUser");
  if (!currentUserStr) {
    alert("SOS Triggered! No user logged in. Sending default info...");
    return;
  }
  const user = JSON.parse(currentUserStr);

  let msg = "SOS Triggered!\n";
  msg += "User phone: " + (user.phone || "N/A") + "\n";
  msg += "Location: " + (user.location || "Unknown") + "\n";
  msg += "Sending to authorities...";

  alert(msg);
}

/*************************************************************
 * AI Matching: find nearest provider by lat/lng
 *************************************************************/
function findNearestProvider(category, custLat, custLng) {
  let users = getArray("users");
  // Filter providers who have coords, same mainCategory, and are not delisted
  let possible = users.filter(u =>
    u.userType === "provider" &&
    !u.delisted &&
    u.providerMainCategory &&
    u.providerMainCategory.toLowerCase() === category.toLowerCase() &&
    u.coords && u.coords.lat && u.coords.lng
  );
  if (!possible.length) {
    return null;
  }

  let minDist = Infinity;
  let chosen = null;
  possible.forEach(p => {
    let dx = (p.coords.lat - custLat);
    let dy = (p.coords.lng - custLng);
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      chosen = p;
    }
  });
  return chosen;
}

/*************************************************************
 * Data: subcat, district, area
 *************************************************************/
const subCatMap = {
  "Electrician": ["Wiring", "Appliance Repair", "Fan Installation"],
  "Plumber": ["Leaks", "Pipes", "Bathroom Fittings"],
  "House Cleaner": ["Deep Cleaning", "Sofa Cleaning", "Carpet Cleaning"],
  "Mover": ["Local Move", "Long Distance", "Packing/Unpacking"],
  "Carpenter": ["Furniture Repair", "Cupboard Installation", "Door/Window Fitting"]
};

const districtMap = {
  "Karnataka": ["Bangalore"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
  "Kerala": ["Kochi", "Thiruvananthapuram"],
  "Andhra Pradesh": ["Vijayawada", "Visakhapatnam"],
  "Telangana": ["Hyderabad", "Warangal"],
  "Gujarat": ["Ahmedabad", "Surat"],
  "Rajasthan": ["Jaipur", "Udaipur"]
};

const areaMap = {
  "Bangalore": ["Yelahanka", "Kengeri", "Majestic", "Hebbal"],
  "Mumbai": ["Andheri", "Bandra", "Juhu", "Goregaon"],
  "Pune": ["Hinjewadi", "Kothrud", "Wakad"],
  // etc. Add more if needed
};

/*************************************************************
 * Clear Histories
 *************************************************************/
function clearCustomerHistory() {
  const currentUserStr = localStorage.getItem("currentUser");
  if (!currentUserStr) return;
  const currentUser = JSON.parse(currentUserStr);
  if (currentUser.userType !== "customer") return;

  let bookings = getArray("bookings");
  // Remove completed bookings for this customer
  bookings = bookings.filter(b => !(b.customerEmail === currentUser.email && b.status === "completed"));
  setArray("bookings", bookings);
  alert("Cleared your completed booking history!");
  window.location.reload();
}

function clearProviderHistory() {
  const currentUserStr = localStorage.getItem("currentUser");
  if (!currentUserStr) return;
  const currentUser = JSON.parse(currentUserStr);
  if (currentUser.userType !== "provider") return;

  let bookings = getArray("bookings");
  // Remove completed bookings for this provider
  bookings = bookings.filter(b => !(b.providerEmail === currentUser.email && b.status === "completed"));
  setArray("bookings", bookings);
  alert("Cleared your completed work history!");
  window.location.reload();
}

/*************************************************************
 * "Not started there" popup
 *************************************************************/
function notStartedPopup() {
  alert("Still not started there!");
}

/*************************************************************
 * Scam Reporting
 *************************************************************/
window.reportScam = function(bookingId) {
  let bookings = getArray("bookings");
  let users = getArray("users");
  const bkIdx = bookings.findIndex(b => b.id === bookingId);
  if (bkIdx < 0) return;

  let booking = bookings[bkIdx];
  if (!booking.providerEmail) {
    alert("No provider assigned yet. Can't report scam.");
    return;
  }
  let provIdx = users.findIndex(u => u.email === booking.providerEmail);
  if (provIdx < 0) {
    alert("Provider not found!");
    return;
  }

  users[provIdx].scamCount = (users[provIdx].scamCount || 0) + 1;
  alert(`Scam reported! This provider now has ${users[provIdx].scamCount} scam reports.`);

  // If scamCount >= 2, delist
  if (users[provIdx].scamCount >= 2) {
    users[provIdx].delisted = true;
    alert("Provider delisted due to multiple scam reports!");
  }

  setArray("users", users);
  localStorage.setItem("currentUser", JSON.stringify(users[provIdx]));
};

/*************************************************************
 * Delist Provider if rating < 2.0
 *************************************************************/
function checkProviderDelistByRating(provider) {
  if (provider.rating && provider.rating < 2.0) {
    provider.delisted = true;
    alert(`Provider ${provider.email} delisted automatically (rating < 2.0)!`);
  }
}

/*************************************************************
 * DOMContentLoaded
 *************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  buildNav();

  /***********************************************************
   * SIGNUP
   **********************************************************/
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    const signupState = document.getElementById("signupState");
    const signupDistrict = document.getElementById("signupDistrict");
    const signupArea = document.getElementById("signupArea");
    const signupCountry = document.getElementById("signupCountry");
    const signupLanguages = document.getElementById("signupLanguages");

    // If these elements exist, add event listeners
    if (signupState && signupDistrict && signupArea) {
      signupState.addEventListener("change", () => {
        signupDistrict.innerHTML = "<option value=''>-- Select District --</option>";
        signupArea.innerHTML = "<option value=''>-- Select Area --</option>";
        const st = signupState.value;

        // If user picks a state not in our map, show popup & reset
        if (st && !districtMap[st]) {
          notStartedPopup();
          signupState.value = "";
          return;
        }

        // Otherwise, populate District
        if (districtMap[st]) {
          districtMap[st].forEach(d => {
            const opt = document.createElement("option");
            opt.value = d;
            opt.textContent = d;
            signupDistrict.appendChild(opt);
          });
        }
      });

      signupDistrict.addEventListener("change", () => {
        signupArea.innerHTML = "<option value=''>-- Select Area --</option>";
        const dist = signupDistrict.value;

        // If areaMap doesn't have the district, popup or skip
        if (dist && !areaMap[dist]) {
          notStartedPopup();
          signupDistrict.value = "";
          return;
        }

        if (areaMap[dist]) {
          areaMap[dist].forEach(a => {
            const opt = document.createElement("option");
            opt.value = a;
            opt.textContent = a;
            signupArea.appendChild(opt);
          });
        }
      });

      signupArea.addEventListener("change", () => {
        const dist = signupDistrict.value;
        const ar = signupArea.value;
        if (dist && areaMap[dist] && !areaMap[dist].includes(ar)) {
          notStartedPopup();
          signupArea.value = "";
        }
      });
    }

    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("signupName").value.trim();
      const email = document.getElementById("signupEmail").value.trim();
      const password = document.getElementById("signupPassword").value.trim();
      const phone = document.getElementById("signupPhone").value.trim();
      const country = signupCountry ? signupCountry.value.trim() : "India";
      const languages = signupLanguages ? signupLanguages.value.trim() : "";

      let stVal = signupState ? signupState.value : "";
      let distVal = signupDistrict ? signupDistrict.value : "";
      let arVal = signupArea ? signupArea.value : "";

      const roleInputs = document.getElementsByName("role");
      let userType = "";
      for (let r of roleInputs) {
        if (r.checked) userType = r.value;
      }

      // Basic required check
      if (!name || !email || !password || !phone || !userType) {
        alert("All fields (including location) are required!");
        return;
      }
      if (!country || !stVal || !distVal || !arVal) {
        alert("Please select valid state/district/area!");
        return;
      }

      let finalLocation = `${country}, ${stVal}, ${distVal}, ${arVal}`;
      let users = getArray("users");
      const existing = users.find(u => u.email === email);
      if (existing) {
        alert("Email already registered. Please log in or use another email.");
        return;
      }

      const newUser = {
        name,
        email,
        password,
        userType,
        phone,
        country,
        languages,
        location: finalLocation,
        profilePic: "",
        description: "",
        rating: 0,
        ratingCount: 0,
        providerMainCategory: "",
        kycVerified: (userType === "provider") ? false : null,
        favorites: (userType === "customer") ? [] : null,
        loyaltyPoints: (userType === "customer") ? 0 : null,
        coords: null,
        tier: null,
        baseRate: null,
        scamCount: 0,
        delisted: false
      };

      users.push(newUser);
      setArray("users", users);

      alert("Sign up successful! You can now log in.");
      window.location.href = "login.html";
    });
  }

  /***********************************************************
   * LOGIN
   **********************************************************/
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value.trim();

      let users = getArray("users");
      const foundUser = users.find(u => u.email === email && u.password === password);

      if (!foundUser) {
        alert("Invalid credentials. Please try again or sign up if you don't have an account.");
        return;
      }
      if (foundUser.delisted) {
        alert("This provider is delisted or your account is flagged. Access denied.");
        return;
      }

      alert("Login successful!");
      localStorage.setItem("currentUser", JSON.stringify(foundUser));

      if (foundUser.userType === "provider") {
        window.location.href = "provider-dashboard.html";
      } else {
        window.location.href = "index.html";
      }
    });
  }

  /***********************************************************
   * BOOK SERVICE
   **********************************************************/
  const mainCategory = document.getElementById("mainCategory");
  const subCategory = document.getElementById("subCategory");
  const bookingImages = document.getElementById("bookingImages");

  if (mainCategory && subCategory) {
    mainCategory.addEventListener("change", () => {
      subCategory.innerHTML = "<option value=''>-- Select Subcategory --</option>";
      if (subCatMap[mainCategory.value]) {
        subCatMap[mainCategory.value].forEach(sc => {
          const opt = document.createElement("option");
          opt.value = sc;
          opt.textContent = sc;
          subCategory.appendChild(opt);
        });
      }
    });
  }

  window.bookService = function() {
    if (!mainCategory || !subCategory) return;
    const cat = mainCategory.value;
    const subCat = subCategory.value;
    const dateTime = document.getElementById("dateTime").value;
    const bookingResult = document.getElementById("bookingResult");

    if (!cat) {
      bookingResult.innerHTML = "<p style='color:red;'>Please select a category.</p>";
      return;
    }
    if (!dateTime) {
      bookingResult.innerHTML = "<p style='color:red;'>Please select a date/time.</p>";
      return;
    }

    const currentUserStr = localStorage.getItem("currentUser");
    if (!currentUserStr) {
      bookingResult.innerHTML = "<p style='color:red;'>You must log in as a customer to book.</p>";
      return;
    }
    const currentUser = JSON.parse(currentUserStr);
    if (currentUser.userType !== "customer") {
      bookingResult.innerHTML = "<p style='color:red;'>Only customers can book services.</p>";
      return;
    }

    // AI matching (fake coords for customer)
    let custLat = 12.97;
    let custLng = 77.59;
    const chosenProvider = findNearestProvider(cat, custLat, custLng);

    let attachedFiles = [];
    if (bookingImages && bookingImages.files.length > 0) {
      for (let file of bookingImages.files) {
        const reader = new FileReader();
        reader.onload = function(e) {
          attachedFiles.push({ name: file.name, data: e.target.result });
          if (attachedFiles.length === bookingImages.files.length) {
            storeBooking(cat, subCat, dateTime, attachedFiles, currentUser, chosenProvider, bookingResult);
          }
        };
        reader.readAsDataURL(file);
      }
    } else {
      storeBooking(cat, subCat, dateTime, attachedFiles, currentUser, chosenProvider, bookingResult);
    }
  };

  function storeBooking(cat, subCat, dateTime, attachedFiles, currentUser, chosenProvider, bookingResult) {
    let bookings = getArray("bookings");
    let providerEmail = chosenProvider ? chosenProvider.email : null;
    let newBooking = {
      id: "bk" + Date.now(),
      mainCategory: cat,
      subCategory: subCat || "",
      dateTime,
      customerEmail: currentUser.email,
      providerEmail,
      status: providerEmail ? "accepted" : "pending",
      attachments: attachedFiles,
      ratingGiven: false,
      rating: 0,
      escrowPaid: true,
      photoApprovalNeeded: false
    };
    bookings.push(newBooking);
    setArray("bookings", bookings);

    if (providerEmail) {
      bookingResult.innerHTML = `<p style='color:green;'>Auto-matched to nearest provider: <strong>${providerEmail}</strong>. Booking <strong>accepted</strong> for <strong>${cat} - ${subCat}</strong> on <strong>${dateTime}</strong>!</p>`;
    } else {
      bookingResult.innerHTML = `<p style='color:orange;'>No provider found with AI matching. Booking is pending. Please wait for a provider in your area!</p>`;
    }
  }

  /***********************************************************
   * PROVIDER DASHBOARD
   **********************************************************/
  const providerProfileForm = document.getElementById("providerProfileForm");
  if (providerProfileForm) {
    const currentUserStr = localStorage.getItem("currentUser");
    if (!currentUserStr) {
      alert("You must log in as a provider to view this page.");
      window.location.href = "login.html";
    } else {
      const currentUser = JSON.parse(currentUserStr);
      if (currentUser.userType !== "provider") {
        alert("Access denied. Only providers can view this page.");
        window.location.href = "index.html";
      } else if (currentUser.delisted) {
        alert("You are delisted due to low rating or multiple scam reports. Access denied.");
        window.location.href = "index.html";
      } else {
        initProviderForm(currentUser);
        loadPendingBookings();
        loadAcceptedBookings();
        loadCompletedBookings();
      }
    }
  }

  function initProviderForm(currentUser) {
    const profileName = document.getElementById("profileName");
    const profilePhone = document.getElementById("profilePhone");
    const profileLat = document.getElementById("profileLat");
    const profileLng = document.getElementById("profileLng");
    const profileState = document.getElementById("profileState");
    const profileDistrict = document.getElementById("profileDistrict");
    const profileArea = document.getElementById("profileArea");
    const profileMainCategory = document.getElementById("profileMainCategory");
    const profileTier = document.getElementById("profileTier");
    const profileBaseRate = document.getElementById("profileBaseRate");
    const profilePic = document.getElementById("profilePic");
    const profileDescription = document.getElementById("profileDescription");
    const providerProfilePreview = document.getElementById("providerProfilePreview");

    profileName.value = currentUser.name || "";
    profilePhone.value = currentUser.phone || "";
    profileDescription.value = currentUser.description || "";

    if (currentUser.coords) {
      profileLat.value = currentUser.coords.lat || "";
      profileLng.value = currentUser.coords.lng || "";
    }

    // parse existing location
    if (currentUser.location) {
      let locParts = currentUser.location.split(",").map(x => x.trim());
      // e.g. "India, Karnataka, Bangalore, Yelahanka"
      if (locParts.length >= 4) {
        const stVal = locParts[1];
        const distVal = locParts[2];
        const areaVal = locParts[3];

        if (districtMap[stVal]) {
          profileState.value = stVal;
          // load districts
          districtMap[stVal].forEach(d => {
            const opt = document.createElement("option");
            opt.value = d;
            opt.textContent = d;
            profileDistrict.appendChild(opt);
          });
          profileDistrict.value = distVal;

          // load area
          if (areaMap[distVal]) {
            areaMap[distVal].forEach(a => {
              const opt = document.createElement("option");
              opt.value = a;
              opt.textContent = a;
              profileArea.appendChild(opt);
            });
            profileArea.value = areaVal;
          }
        }
      }
    }

    if (currentUser.providerMainCategory) {
      profileMainCategory.value = currentUser.providerMainCategory;
    }
    if (currentUser.tier) {
      profileTier.value = currentUser.tier;
    }
    if (currentUser.baseRate) {
      profileBaseRate.value = currentUser.baseRate;
    }

    if (currentUser.profilePic) {
      providerProfilePreview.innerHTML = `
        <img src="${currentUser.profilePic}" alt="Profile Pic" style="max-width: 100px; border-radius: 50%; cursor:pointer;" onclick="showEcard('${currentUser.email}')">
        <p>Rating: ${parseFloat(currentUser.rating || 0).toFixed(1)} ★ (${currentUser.ratingCount || 0} reviews)</p>
        <p><em>Click the photo for eCard</em></p>
      `;
    } else {
      providerProfilePreview.innerHTML = `
        <p>Rating: ${parseFloat(currentUser.rating || 0).toFixed(1)} ★ (${currentUser.ratingCount || 0} reviews)</p>
      `;
    }

    providerProfileForm.addEventListener("submit", (e) => {
      e.preventDefault();
      let users = getArray("users");
      let idx = users.findIndex(u => u.email === currentUser.email);
      if (idx < 0) return;

      users[idx].name = profileName.value.trim();
      users[idx].phone = profilePhone.value.trim();
      users[idx].description = profileDescription.value.trim();

      let latVal = parseFloat(profileLat.value) || null;
      let lngVal = parseFloat(profileLng.value) || null;
      users[idx].coords = { lat: latVal, lng: lngVal };

      let stVal = profileState.value;
      let distVal = profileDistrict.value;
      let arVal = profileArea.value;

      // parse old location just to keep country
      let splitted = currentUser.location.split(",");
      let countryVal = splitted.length ? splitted[0].trim() : "India";
      let finalLoc = `${countryVal}, ${stVal}, ${distVal}, ${arVal}`;
      users[idx].location = finalLoc;

      users[idx].providerMainCategory = profileMainCategory.value.trim();
      users[idx].tier = profileTier.value;
      users[idx].baseRate = parseInt(profileBaseRate.value) || 0;

      // re-check rating for auto-delist
      checkProviderDelistByRating(users[idx]);

      if (profilePic.files && profilePic.files.length > 0) {
        let file = profilePic.files[0];
        let reader = new FileReader();
        reader.onload = function(ev) {
          users[idx].profilePic = ev.target.result;
          setArray("users", users);
          localStorage.setItem("currentUser", JSON.stringify(users[idx]));
          alert("Profile updated with new pic!");
          window.location.reload();
        };
        reader.readAsDataURL(file);
      } else {
        setArray("users", users);
        localStorage.setItem("currentUser", JSON.stringify(users[idx]));
        alert("Profile updated!");
        window.location.reload();
      }
    });
  }

  window.showEcard = function(providerEmail) {
    let users = getArray("users");
    let pUser = users.find(u => u.email === providerEmail);
    if (!pUser) {
      alert("Provider not found!");
      return;
    }
    let ecardMsg = "=== Provider eCard ===\n";
    ecardMsg += "Name: " + pUser.name + "\n";
    ecardMsg += "Phone: " + pUser.phone + "\n";
    ecardMsg += "Location: " + pUser.location + "\n";
    ecardMsg += "Languages: " + (pUser.languages || "N/A") + "\n";
    ecardMsg += "Tier: " + (pUser.tier || "Basic") + ", BaseRate: ₹" + (pUser.baseRate || 0) + "\n";
    ecardMsg += "Scam Reports: " + (pUser.scamCount || 0) + "\n";
    if (pUser.delisted) {
      ecardMsg += "**DELISTED PROVIDER**\n";
    }
    alert(ecardMsg);
  };

  window.simulateExtraRepair = function() {
    alert("Simulating Extra Repair. We'll mark 'photoApprovalNeeded' for all accepted bookings for you.");
    let currentUser = JSON.parse(localStorage.getItem("currentUser"));
    let bookings = getArray("bookings");
    bookings.forEach(b => {
      if (b.providerEmail === currentUser.email && b.status === "accepted") {
        b.photoApprovalNeeded = true;
      }
    });
    setArray("bookings", bookings);
    alert("All accepted bookings now require photo approval from customer.");
  };

  function loadPendingBookings() {
    const pendingBookingsTable = document.getElementById("pendingBookingsTable")
      ? document.getElementById("pendingBookingsTable").querySelector("tbody")
      : null;
    if (!pendingBookingsTable) return;
    pendingBookingsTable.innerHTML = "";

    const currentUserStr = localStorage.getItem("currentUser");
    if (!currentUserStr) return;
    const currentUser = JSON.parse(currentUserStr);

    let allBookings = getArray("bookings");
    let relevant = allBookings.filter(b =>
      b.status === "pending" &&
      b.mainCategory &&
      b.mainCategory.toLowerCase() === currentUser.providerMainCategory.toLowerCase()
    );

    let users = getArray("users");
    relevant.forEach(bk => {
      // skip if the provider is delisted
      if (users.find(u => u.email === bk.providerEmail && u.delisted)) {
        return;
      }
      const row = document.createElement("tr");
      const tdService = document.createElement("td");
      tdService.textContent = bk.mainCategory + (bk.subCategory ? " - " + bk.subCategory : "");

      const tdDate = document.createElement("td");
      tdDate.textContent = bk.dateTime;

      const tdCustomer = document.createElement("td");
      tdCustomer.textContent = bk.customerEmail;

      let custUser = users.find(u => u.email === bk.customerEmail);
      const tdCustLocation = document.createElement("td");
      tdCustLocation.textContent = custUser ? custUser.location : "Unknown";

      const tdStatus = document.createElement("td");
      tdStatus.textContent = bk.status;

      const tdAttach = document.createElement("td");
      if (bk.attachments && bk.attachments.length > 0) {
        tdAttach.textContent = bk.attachments.map(a => a.name).join(", ");
      } else {
        tdAttach.textContent = "None";
      }

      const tdAction = document.createElement("td");
      const acceptBtn = document.createElement("button");
      acceptBtn.textContent = "Accept";
      acceptBtn.style.marginRight = "5px";
      acceptBtn.onclick = () => updateBookingStatus(bk.id, "accepted");

      const rejectBtn = document.createElement("button");
      rejectBtn.textContent = "Reject";
      rejectBtn.onclick = () => updateBookingStatus(bk.id, "rejected");

      tdAction.appendChild(acceptBtn);
      tdAction.appendChild(rejectBtn);

      row.appendChild(tdService);
      row.appendChild(tdDate);
      row.appendChild(tdCustomer);
      row.appendChild(tdCustLocation);
      row.appendChild(tdStatus);
      row.appendChild(tdAttach);
      row.appendChild(tdAction);

      pendingBookingsTable.appendChild(row);
    });
  }

  function loadAcceptedBookings() {
    const acceptedBookingsTable = document.getElementById("acceptedBookingsTable")
      ? document.getElementById("acceptedBookingsTable").querySelector("tbody")
      : null;
    if (!acceptedBookingsTable) return;
    acceptedBookingsTable.innerHTML = "";

    const currentUserStr = localStorage.getItem("currentUser");
    if (!currentUserStr) return;
    const currentUser = JSON.parse(currentUserStr);

    let allBookings = getArray("bookings");
    const relevant = allBookings.filter(b => b.status === "accepted" && b.providerEmail === currentUser.email);

    relevant.forEach(bk => {
      const row = document.createElement("tr");
      const tdService = document.createElement("td");
      tdService.textContent = bk.mainCategory + (bk.subCategory ? " - " + bk.subCategory : "");

      const tdDate = document.createElement("td");
      tdDate.textContent = bk.dateTime;

      const tdCustomer = document.createElement("td");
      tdCustomer.textContent = bk.customerEmail;

      const tdStatus = document.createElement("td");
      let statusText = bk.status;
      if (bk.photoApprovalNeeded) {
        statusText += " (Photo Pre-Approval needed)";
      }
      tdStatus.textContent = statusText;

      const tdAttach = document.createElement("td");
      if (bk.attachments && bk.attachments.length > 0) {
        tdAttach.textContent = bk.attachments.map(a => a.name).join(", ");
      } else {
        tdAttach.textContent = "None";
      }

      const tdAction = document.createElement("td");
      const completeBtn = document.createElement("button");
      completeBtn.textContent = "Mark Completed";
      completeBtn.style.marginRight = "5px";
      completeBtn.onclick = () => updateBookingStatus(bk.id, "completed");

      const rejectBtn = document.createElement("button");
      rejectBtn.textContent = "Reject";
      rejectBtn.onclick = () => updateBookingStatus(bk.id, "rejected");

      tdAction.appendChild(completeBtn);
      tdAction.appendChild(rejectBtn);

      row.appendChild(tdService);
      row.appendChild(tdDate);
      row.appendChild(tdCustomer);
      row.appendChild(tdStatus);
      row.appendChild(tdAttach);
      row.appendChild(tdAction);

      acceptedBookingsTable.appendChild(row);
    });
  }

  function loadCompletedBookings() {
    const completedBookingsTable = document.getElementById("completedBookingsTable")
      ? document.getElementById("completedBookingsTable").querySelector("tbody")
      : null;
    if (!completedBookingsTable) return;
    completedBookingsTable.innerHTML = "";

    const currentUserStr = localStorage.getItem("currentUser");
    if (!currentUserStr) return;
    const currentUser = JSON.parse(currentUserStr);

    let allBookings = getArray("bookings");
    const relevant = allBookings.filter(b => b.status === "completed" && b.providerEmail === currentUser.email);

    relevant.forEach(bk => {
      const row = document.createElement("tr");
      const tdService = document.createElement("td");
      tdService.textContent = bk.mainCategory + (bk.subCategory ? " - " + bk.subCategory : "");

      const tdDate = document.createElement("td");
      tdDate.textContent = bk.dateTime;

      const tdCustomer = document.createElement("td");
      tdCustomer.textContent = bk.customerEmail;

      const tdAttach = document.createElement("td");
      if (bk.attachments && bk.attachments.length > 0) {
        tdAttach.textContent = bk.attachments.map(a => a.name).join(", ");
      } else {
        tdAttach.textContent = "None";
      }

      const tdRating = document.createElement("td");
      if (bk.ratingGiven) {
        tdRating.textContent = bk.rating + " ★";
      } else {
        tdRating.textContent = "No rating yet";
      }

      row.appendChild(tdService);
      row.appendChild(tdDate);
      row.appendChild(tdCustomer);
      row.appendChild(tdAttach);
      row.appendChild(tdRating);

      completedBookingsTable.appendChild(row);
    });
  }

  function updateBookingStatus(bookingId, newStatus) {
    let bookings = getArray("bookings");
    const idx = bookings.findIndex(b => b.id === bookingId);
    if (idx >= 0) {
      bookings[idx].status = newStatus;
      if (newStatus === "accepted") {
        const currentUser = JSON.parse(localStorage.getItem("currentUser"));
        bookings[idx].providerEmail = currentUser.email;
      } else if (newStatus === "rejected") {
        bookings[idx].providerEmail = null;
      } else if (newStatus === "completed") {
        // Escrow release, platform fee note, add loyalty points
        const currentUser = JSON.parse(localStorage.getItem("currentUser"));
        let providerBaseRate = currentUser.baseRate || 0;
        let finalPay = Math.floor(providerBaseRate * 0.9); // 10% platform fee
        alert(`Booking completed! Provider receives ~₹${finalPay} after platform fee. Escrow released.`);

        const custEmail = bookings[idx].customerEmail;
        let users = getArray("users");
        let cIdx = users.findIndex(u => u.email === custEmail);
        if (cIdx >= 0 && users[cIdx].userType === "customer") {
          users[cIdx].loyaltyPoints = (users[cIdx].loyaltyPoints || 0) + 50;
          alert("Customer earned +50 loyalty points!");
        }
        setArray("users", users);
      }
      setArray("bookings", bookings);
      alert(`Booking ${newStatus}!`);
      loadPendingBookings();
      loadAcceptedBookings();
      loadCompletedBookings();
    }
  }

  /***********************************************************
   * MY BOOKINGS (Customer)
   **********************************************************/
  if (document.getElementById("myBookingsTable")) {
    const myBookingsTable = document.getElementById("myBookingsTable").querySelector("tbody");
    const myFavoritesList = document.getElementById("myFavoritesList");
    const currentUserStr = localStorage.getItem("currentUser");
    if (!currentUserStr) {
      alert("You must log in as a customer to view this page.");
      window.location.href = "login.html";
      return;
    }
    const currentUser = JSON.parse(currentUserStr);
    if (currentUser.userType !== "customer") {
      alert("Access denied. Only customers can view My Bookings.");
      window.location.href = "index.html";
      return;
    }

    function loadMyBookings() {
      myBookingsTable.innerHTML = "";
      const allBookings = getArray("bookings");
      const userBookings = allBookings.filter(b => b.customerEmail === currentUser.email);

      let users = getArray("users");
      userBookings.forEach(bk => {
        const row = document.createElement("tr");

        const tdService = document.createElement("td");
        tdService.textContent = bk.mainCategory + (bk.subCategory ? " - " + bk.subCategory : "");

        const tdDate = document.createElement("td");
        tdDate.textContent = bk.dateTime;

        let statusText = bk.status;
        if (bk.photoApprovalNeeded) {
          statusText += " (Provider requests photo approval!)";
        }
        const tdStatus = document.createElement("td");
        tdStatus.textContent = statusText;

        const tdProviderInfo = document.createElement("td");
        if (bk.providerEmail && (bk.status === "accepted" || bk.status === "completed")) {
          let providerUser = users.find(u => u.email === bk.providerEmail);
          if (providerUser) {
            let ratingVal = parseFloat(providerUser.rating || 0).toFixed(1);
            let ratingCount = providerUser.ratingCount || 0;
            tdProviderInfo.innerHTML = `
              <div style="display:flex; align-items:center; gap:1rem;">
                <div>
                  <p><strong>${providerUser.name}</strong> (${providerUser.email})</p>
                  <p><strong>Phone:</strong> ${providerUser.phone}</p>
                  <p><strong>Location:</strong> ${providerUser.location}</p>
                  <p><strong>Tier:</strong> ${providerUser.tier || "Basic"}</p>
                  <p><strong>Base Rate:</strong> ₹${providerUser.baseRate || 0}</p>
                  <p><strong>Rating:</strong> ${ratingVal} ★ (${ratingCount} reviews)</p>
                  <button style="background:none; border:none; color:red; font-size:1rem; cursor:pointer;" 
                          onclick="reportScam('${bk.id}')" title="Report Scam">
                    Report Scam
                  </button>
                </div>
                ${
                  providerUser.profilePic
                    ? `<img src="${providerUser.profilePic}" alt="Profile Pic" style="max-width:60px; border-radius:50%; cursor:pointer;" onclick="showEcard('${providerUser.email}')">`
                    : ""
                }
                <button style="background:none; border:none; color:red; font-size:1.2rem; cursor:pointer;" 
                        onclick="addToFavorites('${providerUser.email}')" title="Add to Favorites">♥</button>
              </div>
            `;
          } else {
            tdProviderInfo.textContent = "Provider data not found.";
          }
        } else {
          tdProviderInfo.textContent = "No provider assigned or not accepted yet.";
        }

        // Rating cell
        const tdRating = document.createElement("td");
        if (bk.status === "completed" && bk.providerEmail) {
          if (!bk.ratingGiven) {
            const ratingSelect = document.createElement("select");
            for (let i = 0; i <= 5; i++) {
              let opt = document.createElement("option");
              opt.value = i;
              opt.textContent = i + " ★";
              ratingSelect.appendChild(opt);
            }
            const rateBtn = document.createElement("button");
            rateBtn.textContent = "Rate";
            rateBtn.style.marginLeft = "5px";
            rateBtn.onclick = () => submitRating(bk.id, ratingSelect.value);
            tdRating.appendChild(ratingSelect);
            tdRating.appendChild(rateBtn);
          } else {
            tdRating.textContent = bk.rating + " ★";
          }
        } else {
          tdRating.textContent = "N/A";
        }

        row.appendChild(tdService);
        row.appendChild(tdDate);
        row.appendChild(tdStatus);
        row.appendChild(tdProviderInfo);
        row.appendChild(tdRating);

        myBookingsTable.appendChild(row);
      });

      loadFavorites(currentUser);
    }

    window.addToFavorites = function(providerEmail) {
      let users = getArray("users");
      let cIdx = users.findIndex(u => u.email === currentUser.email);
      if (cIdx < 0) return;
      if (!users[cIdx].favorites.includes(providerEmail)) {
        users[cIdx].favorites.push(providerEmail);
        setArray("users", users);
        localStorage.setItem("currentUser", JSON.stringify(users[cIdx]));
        alert("Provider added to Favorites!");
      } else {
        alert("Already in Favorites!");
      }
      loadFavorites(users[cIdx]);
    };

    function loadFavorites(cUser) {
      if (!myFavoritesList) return;
      myFavoritesList.innerHTML = "";
      if (!cUser.favorites || !cUser.favorites.length) {
        myFavoritesList.innerHTML = "<p>No favorites yet.</p>";
        return;
      }
      let users = getArray("users");
      cUser.favorites.forEach(favEmail => {
        let pUser = users.find(u => u.email === favEmail);
        if (pUser) {
          let div = document.createElement("div");
          div.style.border = "1px solid #ccc";
          div.style.padding = "0.5rem";
          div.style.marginBottom = "0.5rem";
          div.innerHTML = `
            <strong>${pUser.name}</strong> (${pUser.email}) - 
            ${pUser.providerMainCategory} [${pUser.tier || "Basic"}]
            <br><em>Phone:</em> ${pUser.phone}
            <br><button onclick="removeFavorite('${favEmail}')">Remove</button>
          `;
          myFavoritesList.appendChild(div);
        }
      });
    }

    window.removeFavorite = function(providerEmail) {
      let users = getArray("users");
      let cIdx = users.findIndex(u => u.email === currentUser.email);
      if (cIdx < 0) return;
      let arr = users[cIdx].favorites;
      users[cIdx].favorites = arr.filter(e => e !== providerEmail);
      setArray("users", users);
      localStorage.setItem("currentUser", JSON.stringify(users[cIdx]));
      alert("Removed from Favorites!");
      loadFavorites(users[cIdx]);
    };

    function submitRating(bookingId, ratingValue) {
      let bookings = getArray("bookings");
      let users = getArray("users");
      const bkIdx = bookings.findIndex(b => b.id === bookingId);
      if (bkIdx < 0) return;

      bookings[bkIdx].ratingGiven = true;
      bookings[bkIdx].rating = ratingValue;

      let providerEmail = bookings[bkIdx].providerEmail;
      if (providerEmail) {
        let provIdx = users.findIndex(u => u.email === providerEmail);
        if (provIdx >= 0) {
          let pUser = users[provIdx];
          let oldCount = pUser.ratingCount || 0;
          let oldRating = pUser.rating || 0;

          let newCount = oldCount + 1;
          let newRating = ((oldRating * oldCount) + parseInt(ratingValue)) / newCount;

          pUser.ratingCount = newCount;
          pUser.rating = newRating;
          checkProviderDelistByRating(pUser); // auto-delist if < 2.0
          users[provIdx] = pUser;
        }
      }
      setArray("bookings", bookings);
      setArray("users", users);
      alert("Rating submitted!");
      loadMyBookings();
    }

    loadMyBookings();
  }

  /***********************************************************
   * REVIEWS PAGE
   **********************************************************/
  const reviewsContainer = document.getElementById("reviewsContainer");
  if (reviewsContainer) {
    const allBookings = getArray("bookings").filter(b => b.status === "completed" && b.ratingGiven);
    const users = getArray("users");

    if (allBookings.length === 0) {
      reviewsContainer.innerHTML = "<p>No reviews found yet.</p>";
    } else {
      allBookings.forEach(bk => {
        const provider = users.find(u => u.email === bk.providerEmail);
        const ratingStars = "★★★★★".slice(0, bk.rating) + "☆☆☆☆☆".slice(0, 5 - bk.rating);

        const div = document.createElement("div");
        div.classList.add("testimonial");
        div.innerHTML = `
          <div class="stars">${ratingStars}</div>
          <p>“Service: ${bk.mainCategory}${bk.subCategory ? " - " + bk.subCategory : ""}. Rating: ${bk.rating}.”</p>
          <h4>– Customer: ${bk.customerEmail}</h4>
          <small>Provider: ${provider ? provider.name : "Unknown"}</small>
        `;
        reviewsContainer.appendChild(div);
      });
    }
  }
});
