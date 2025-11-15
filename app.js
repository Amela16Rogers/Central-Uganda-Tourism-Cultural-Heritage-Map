// Main application initialization
class TourismMap {
    constructor() {
        this.map = null;
        this.markers = [];
        this.layerGroups = {
            historical: L.layerGroup(),
            cultural: L.layerGroup(),
            natural: L.layerGroup()
        };
        this.routingControl = null;
        this.userLocationMarker = null;
        
        this.initMap();
        this.loadSites();
        this.setupEventListeners();
        this.updateSiteCount();
    }

    initMap() {
        // Initialize map centered on Kampala
        this.map = L.map('map').setView([0.3476, 32.5825], 11);

        // Add base layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(this.map);

        // Add scale control to the map
        L.control.scale({
            position: 'bottomleft',
            imperial: false,
            maxWidth: 200,
            updateWhenIdle: true
        }).addTo(this.map);

        // Add all layer groups to map initially
        Object.values(this.layerGroups).forEach(layer => {
            layer.addTo(this.map);
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            setTimeout(() => {
                this.map.invalidateSize();
            }, 100);
        });
    }

    loadSites() {
        const sitesContainer = document.getElementById('sitesContainer');
        const startSelect = document.getElementById('startPoint');
        const endSelect = document.getElementById('endPoint');

        // Clear existing content
        sitesContainer.innerHTML = '';
        startSelect.innerHTML = '<option value="">Select starting point</option>';
        endSelect.innerHTML = '<option value="">Select destination</option>';

        // Add "Current Location" option to start point
        startSelect.add(new Option('📍 My Current Location', 'currentLocation'));

        // Load ALL sites for display and markers
        tourismSites.forEach(site => {
            this.createMarker(site);
            this.createSiteListItem(site, sitesContainer);
            
            // Add to start point dropdown (all sites)
            startSelect.add(new Option(site.name, site.id));
            
            // Add to end point dropdown (only cultural sites for routing)
            if (site.category === 'cultural') {
                endSelect.add(new Option(site.name, site.id));
            }
        });

        console.log('✅ All tourism sites loaded successfully');
        console.log('📍 Cultural sites available for routing:', tourismSites.filter(site => site.category === 'cultural').length);
    }

    createMarker(site) {
        const icon = this.getIconForCategory(site.category);
        
        const marker = L.marker([site.lat, site.lng], { icon })
            .bindPopup(this.createPopupContent(site));
        
        // Add to appropriate layer group
        this.layerGroups[site.category].addLayer(marker);
        this.markers.push(marker);
        
        // Add click event
        marker.on('click', () => {
            this.map.flyTo([site.lat, site.lng], 15);
        });
    }

    getIconForCategory(category) {
        const colors = {
            historical: 'red',
            cultural: 'blue',
            natural: 'green'
        };
        
        return L.icon({
            iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${colors[category]}.png`,
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });
    }

    createPopupContent(site) {
        const imageHtml = this.createImageWithFallback(site);
        
        return `
            <div class="popup-content">
                <h3>${site.name}</h3>
                <p><strong>Category:</strong> <span class="category-${site.category}">${site.category.charAt(0).toUpperCase() + site.category.slice(1)}</span></p>
                <p>${site.description}</p>
                ${imageHtml}
                <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
                    <strong>Coordinates:</strong> ${site.lat.toFixed(4)}, ${site.lng.toFixed(4)}
                </div>
            </div>
        `;
    }

    createImageWithFallback(site) {
        const siteNameForUrl = site.name.replace(/'/g, '').replace(/&/g, 'and');
        const placeholderUrl = `https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=${encodeURIComponent(siteNameForUrl)}`;
        
        return `
            <div class="image-container">
                <img src="${site.image}" 
                     alt="${site.name}"
                     onerror="
                         console.log('🖼️ Image failed to load, using placeholder:', '${site.image}');
                         this.src = '${placeholderUrl}';
                         this.onerror = null;
                     "
                     onload="console.log('✅ Image loaded successfully:', '${site.image}')"
                     style="width: 100%; height: 180px; object-fit: cover; border-radius: 8px; margin: 0.5rem 0;">
            </div>
        `;
    }

    createSiteListItem(site, container) {
        const div = document.createElement('div');
        div.className = `site-item ${site.category}`;
        div.innerHTML = `
            <h4>${site.name}</h4>
            <small>${site.category.toUpperCase()}</small>
            <p>${site.description.substring(0, 80)}...</p>
            <div class="coordinates">
                📍 ${site.lat.toFixed(4)}, ${site.lng.toFixed(4)}
            </div>
        `;
        
        div.addEventListener('click', () => {
            this.map.flyTo([site.lat, site.lng], 15);
            this.markers.forEach(marker => {
                const latLng = marker.getLatLng();
                if (Math.abs(latLng.lat - site.lat) < 0.0001 && Math.abs(latLng.lng - site.lng) < 0.0001) {
                    setTimeout(() => marker.openPopup(), 1000);
                }
            });
        });
        
        container.appendChild(div);
    }

    setupEventListeners() {
        // Filter checkboxes
        document.getElementById('historical').addEventListener('change', (e) => this.toggleLayer('historical', e.target.checked));
        document.getElementById('cultural').addEventListener('change', (e) => this.toggleLayer('cultural', e.target.checked));
        document.getElementById('natural').addEventListener('change', (e) => this.toggleLayer('natural', e.target.checked));

        // Route controls
        document.getElementById('calculateRoute').addEventListener('click', () => this.calculateRoute());
        document.getElementById('clearRoute').addEventListener('click', () => this.clearRoute());

        // Location button
        document.getElementById('locateMe').addEventListener('click', () => this.locateUser());

        // Search functionality
        document.getElementById('search-btn').addEventListener('click', () => this.searchSites());
        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchSites();
            }
        });

        // Update site count when filters change
        document.querySelectorAll('.filter-group input').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateSiteCount());
        });
    }

    locateUser() {
        const locateBtn = document.getElementById('locateMe');
        const locationStatus = document.getElementById('locationStatus');
        
        locateBtn.disabled = true;
        locateBtn.innerHTML = '⏳ Locating...';
        locationStatus.textContent = 'Getting your location...';
        locationStatus.style.color = '#ff8c00';

        if (!navigator.geolocation) {
            locationStatus.textContent = 'Geolocation is not supported by your browser';
            locationStatus.style.color = '#dc3545';
            locateBtn.disabled = false;
            locateBtn.innerHTML = '📍 Locate Me';
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;

                // Remove existing user location marker
                if (this.userLocationMarker) {
                    this.map.removeLayer(this.userLocationMarker);
                }

                // Create custom user location icon
                const userIcon = L.divIcon({
                    className: 'user-location-marker',
                    html: '<div style="background: #28a745; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3);"></div>',
                    iconSize: [26, 26],
                    iconAnchor: [13, 13]
                });

                // Add user location marker
                this.userLocationMarker = L.marker([lat, lng], { icon: userIcon })
                    .addTo(this.map)
                    .bindPopup(`
                        <div style="text-align: center;">
                            <h4>📍 Your Location</h4>
                            <p>Lat: ${lat.toFixed(6)}</p>
                            <p>Lng: ${lng.toFixed(6)}</p>
                            <p style="font-size: 0.8em; color: #666;">Accuracy: ±${Math.round(accuracy)} meters</p>
                        </div>
                    `)
                    .openPopup();

                // Center map on user location
                this.map.flyTo([lat, lng], 15);

                locationStatus.textContent = `Location found! Accuracy: ±${Math.round(accuracy)} meters`;
                locationStatus.style.color = '#28a745';
                locateBtn.disabled = false;
                locateBtn.innerHTML = '📍 Locate Me';

                console.log('📍 User location found:', { lat, lng, accuracy });
            },
            (error) => {
                let errorMessage = 'Unable to retrieve your location';
                
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access denied. Please enable location permissions.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out.';
                        break;
                }

                locationStatus.textContent = errorMessage;
                locationStatus.style.color = '#dc3545';
                locateBtn.disabled = false;
                locateBtn.innerHTML = '📍 Locate Me';

                console.error('📍 Location error:', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }

    searchSites() {
        const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
        const siteItems = document.querySelectorAll('.site-item');
        
        siteItems.forEach(item => {
            const siteName = item.querySelector('h4').textContent.toLowerCase();
            const siteDescription = item.querySelector('p').textContent.toLowerCase();
            
            if (siteName.includes(searchTerm) || siteDescription.includes(searchTerm)) {
                item.style.display = 'block';
                item.style.animation = 'fadeInUp 0.3s ease-out';
            } else {
                item.style.display = 'none';
            }
        });

        // Update site count for visible items
        const visibleCount = Array.from(siteItems).filter(item => item.style.display !== 'none').length;
        document.querySelector('.site-count').textContent = `(${visibleCount} sites)`;
    }

    toggleLayer(category, show) {
        if (show) {
            this.map.addLayer(this.layerGroups[category]);
        } else {
            this.map.removeLayer(this.layerGroups[category]);
        }
        this.updateSiteCount();
    }

    updateSiteCount() {
        const historicalChecked = document.getElementById('historical').checked;
        const culturalChecked = document.getElementById('cultural').checked;
        const naturalChecked = document.getElementById('natural').checked;

        let visibleCount = 0;
        
        if (historicalChecked) visibleCount += tourismSites.filter(site => site.category === 'historical').length;
        if (culturalChecked) visibleCount += tourismSites.filter(site => site.category === 'cultural').length;
        if (naturalChecked) visibleCount += tourismSites.filter(site => site.category === 'natural').length;

        if (!historicalChecked && !culturalChecked && !naturalChecked) {
            visibleCount = tourismSites.length;
        }

        document.querySelector('.site-count').textContent = `(${visibleCount} sites)`;
    }

    calculateRoute() {
        const startPoint = document.getElementById('startPoint').value;
        const endId = document.getElementById('endPoint').value;
        
        if (!endId) {
            alert('Please select a cultural destination');
            return;
        }

        const endSite = tourismSites.find(site => site.id == endId);

        if (!endSite) {
            alert('Selected destination not found');
            return;
        }

        this.clearRoute();

        // If "currentLocation" is selected as start point
        if (startPoint === "currentLocation") {
            this.calculateRouteFromCurrentLocation(endSite);
        } else {
            // Original route calculation between two sites
            const startSite = tourismSites.find(site => site.id == startPoint);
            if (!startSite) {
                alert('Selected starting point not found');
                return;
            }

            this.createRouteBetweenSites(startSite, endSite);
        }
    }

    calculateRouteFromCurrentLocation(endSite) {
        const locateBtn = document.getElementById('locateMe');
        const locationStatus = document.getElementById('locationStatus');
        
        locateBtn.disabled = true;
        locateBtn.innerHTML = '⏳ Getting route...';
        locationStatus.textContent = 'Getting your location for route calculation...';
        locationStatus.style.color = '#ff8c00';

        if (!navigator.geolocation) {
            locationStatus.textContent = 'Geolocation is not supported by your browser';
            locationStatus.style.color = '#dc3545';
            locateBtn.disabled = false;
            locateBtn.innerHTML = '📍 Locate Me';
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;

                // Remove existing user location marker if any
                if (this.userLocationMarker) {
                    this.map.removeLayer(this.userLocationMarker);
                }

                // Create custom user location icon for route start
                const userIcon = L.divIcon({
                    className: 'user-location-marker route-start',
                    html: '<div style="background: #28a745; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3); font-size: 12px; display: flex; align-items: center; justify-content: center; color: white;">🚶</div>',
                    iconSize: [26, 26],
                    iconAnchor: [13, 13]
                });

                // Add user location marker as route start
                this.userLocationMarker = L.marker([userLat, userLng], { icon: userIcon })
                    .addTo(this.map)
                    .bindPopup(`
                        <div style="text-align: center;">
                            <h4>📍 Route Start</h4>
                            <p>Your Current Location</p>
                            <p>Lat: ${userLat.toFixed(6)}</p>
                            <p>Lng: ${userLng.toFixed(6)}</p>
                        </div>
                    `);

                // Create the route from user location to cultural site
                this.createRoute([userLat, userLng], endSite);

                locationStatus.textContent = `Route calculated from your location to ${endSite.name}`;
                locationStatus.style.color = '#28a745';
                locateBtn.disabled = false;
                locateBtn.innerHTML = '📍 Locate Me';

                console.log('🗺️ Route calculated from current location to:', endSite.name);
            },
            (error) => {
                let errorMessage = 'Unable to retrieve your location for route calculation';
                
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access denied. Please enable location permissions to calculate route from your current location.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable for route calculation.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out. Please try again.';
                        break;
                }

                locationStatus.textContent = errorMessage;
                locationStatus.style.color = '#dc3545';
                locateBtn.disabled = false;
                locateBtn.innerHTML = '📍 Locate Me';

                console.error('📍 Location error for route calculation:', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000, // Longer timeout for route calculation
                maximumAge: 60000
            }
        );
    }

    createRoute(startPoint, endSite) {
        try {
            const startLatLng = Array.isArray(startPoint) ? 
                L.latLng(startPoint[0], startPoint[1]) : 
                L.latLng(startPoint.lat, startPoint.lng);

            this.routingControl = L.Routing.control({
                waypoints: [
                    startLatLng,
                    L.latLng(endSite.lat, endSite.lng)
                ],
                routeWhileDragging: false,
                showAlternatives: false,
                lineOptions: {
                    styles: [{ color: '#2c5aa0', weight: 6, opacity: 0.7 }]
                },
                createMarker: (i, waypoint, n) => {
                    // Don't create markers for waypoints since we have our own
                    return null;
                }
            }).addTo(this.map);

            // Add custom start and end markers
            this.addRouteMarkers(startLatLng, endSite);

        } catch (error) {
            console.error("Error creating route:", error);
            alert("Unable to calculate route. Please try again.");
        }
    }

    addRouteMarkers(startLatLng, endSite) {
        // Start marker (user location or selected site)
        const startIcon = L.divIcon({
            className: 'route-start-marker',
            html: '<div style="background: #28a745; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        L.marker(startLatLng, { icon: startIcon })
            .addTo(this.map)
            .bindPopup('<div style="text-align: center;"><strong>Route Start</strong><br>Your Location</div>');

        // End marker (cultural site)
        const endIcon = L.divIcon({
            className: 'route-end-marker',
            html: '<div style="background: #dc3545; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        L.marker([endSite.lat, endSite.lng], { icon: endIcon })
            .addTo(this.map)
            .bindPopup(`<div style="text-align: center;"><strong>Destination</strong><br>${endSite.name}</div>`);
    }

    createRouteBetweenSites(startSite, endSite) {
        this.createRoute(startSite, endSite);
        console.log('🗺️ Route calculated between:', startSite.name, 'and', endSite.name);
    }

    clearRoute() {
        if (this.routingControl) {
            this.map.removeControl(this.routingControl);
            this.routingControl = null;
            console.log('🗺️ Route cleared');
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Starting Uganda Tourism Map Application...');
    new TourismMap();
});