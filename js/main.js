/* globals ApiHelper, L */
var newMap;

const UdacityYelp = {
    restaurants   : [],
    neighborhoods : [],
    cuisines      : [],
    markers       : [],

    init () {
        this.initMap();
        this.setNeighborhoods()
        this.setCuisines()
    },

    setNeighborhoods () {
        ApiHelper.fetchNeighborhoods()
            .then(neighborhoods => this.neighborhoods = neighborhoods)
            .then(() => this.fillNeighborhoodsHTML())
            .catch(error => {
                throw error;
            });
    },

    fillNeighborhoodsHTML () {
        const select = document.getElementById('neighborhoods-select');

        this.neighborhoods.forEach(neighborhood => {
            const option = document.createElement('option');
            option.innerHTML = neighborhood;
            option.value = neighborhood;
            select.append(option);
        });
    },

    setCuisines () {
        ApiHelper.fetchCuisines()
            .then(cuisines => this.cuisines = cuisines)
            .then(() => this.fillCuisinesHTML())
            .catch(error => {
                throw error;
            });
    },

    fillCuisinesHTML () {
        const select = document.getElementById('cuisines-select');

        this.cuisines.forEach(cuisine => {
            const option = document.createElement('option');
            option.innerHTML = cuisine;
            option.value = cuisine;
            select.append(option);
        });
    },

    // Initialize leaflet map, called from HTML.
    initMap () {
        newMap = L.map('map', {
            center: [40.722216, -73.987501],
            zoom: 12,
            scrollWheelZoom: false
        });

        L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
            mapboxToken: 'pk.eyJ1Ijoiam9ubGluayIsImEiOiJjamwzM3c2enowM3cxM3ZyeHp5ejl4M3c5In0.QfxCqP7NfzFifui4vPyMuA',
            maxZoom: 18,
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
                '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
            id: 'mapbox.streets'
        }).addTo(newMap);

        this.updateRestaurants();
    },

    // Update page and map for current restaurants.
    updateRestaurants () {
        const cuisine_select      = document.getElementById('cuisines-select');
        const neighborhood_Select = document.getElementById('neighborhoods-select');

        const cIndex = cuisine_select.selectedIndex;
        const nIndex = neighborhood_Select.selectedIndex;

        const cuisine      = cuisine_select[cIndex].value;
        const neighborhood = neighborhood_Select[nIndex].value;

        ApiHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood)
            .then(restaurants => {
                this.resetRestaurants(restaurants)
                    .fillRestaurantsHTML()
            })
            .catch(error => {
                throw error;
            });

        // ApiHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
        //     if (error) { // Got an error!
        //         throw error;
        //     } else {
        //         this.resetRestaurants(restaurants);
        //         this.fillRestaurantsHTML();
        //     }
        // })
    },

    // Clear current restaurants, their HTML and remove their map markers.
    resetRestaurants (restaurants) {

        // Remove all restaurants
        this.restaurants = [];
        const ul = document.getElementById('restaurants-list');
        ul.innerHTML = '';

        // Remove all map markers
        if (this.markers) {
            this.markers.forEach(marker => marker.remove());
        }
        this.markers     = [];
        this.restaurants = restaurants;

        return this;
    },

    // Create all restaurants HTML and add them to the webpage.
    fillRestaurantsHTML (restaurants = this.restaurants) {
        const ul = document.getElementById('restaurants-list');
        restaurants.forEach(restaurant => {
            ul.append(this.createRestaurantHTML(restaurant));
        });
        return this.addMarkersToMap();
    },

    // Create restaurant HTML.
    createRestaurantHTML (restaurant) {
        const img_url_fragment = ApiHelper.imageUrlForRestaurant(restaurant);
        const html = `
        <div>
            <img class="restaurant-img" alt="classy photo from ${restaurant.name}" src="${img_url_fragment}-300.jpg" srcset="${img_url_fragment}-600.jpg 1000w, ${img_url_fragment}-1200.jpg 2000w">
            <h1>${restaurant.name}</h1>
            <p>${restaurant.neighborhood}</p>
            <p>${restaurant.address}</p>
            <a href="${ApiHelper.urlForRestaurant(restaurant)}" aria-label="${restaurant.name}. View details">View Details</a>
        </div>`;
        return document.createRange().createContextualFragment(html);
    },

    // Add markers for current restaurants to the map.
    addMarkersToMap (restaurants = this.restaurants) {
        restaurants.forEach(restaurant => {
            // Add marker to the map
            const marker = ApiHelper.mapMarkerForRestaurant(restaurant, this.newMap);
            marker.on("click", onClick);
            marker.tabindex = -1;

            function onClick() {
                window.location.href = marker.options.url;
            }
            this.markers.push(marker);
        });
        return this;
    },
}

document.addEventListener('DOMContentLoaded', () => {
    UdacityYelp.init();
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}
