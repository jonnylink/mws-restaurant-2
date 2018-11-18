/* globals newMap, L, idb */

const eatDB = idb.open('UdacityEats', '3', upgradeDb => {
    const restaurants = upgradeDb.createObjectStore('restaurants', {keyPath : 'id'});
    const reviews     = upgradeDb.createObjectStore('reviews', {keyPath : 'id'});
    restaurants.createIndex('id', 'id');
    reviews.createIndex('id', 'id');
    reviews.createIndex('restaurant_id', 'restaurant_id');
});

const storeLocal = (data, store_name) => {
    eatDB.then(db => {
        const transaction = db.transaction(store_name, 'readwrite');
        const store       = transaction.objectStore(store_name);

        data.forEach(datum => {
            store.put(datum);
        });

        return transaction.complete;
    });
}

const ApiHelper = {
    BASE_URL : `http://localhost:1337`,

    fetchRestaurants() {
        return fetch(`${this.BASE_URL}/restaurants`)
            .then(response => response.json())
            .then(restaurants => {                
                storeLocal(restaurants, 'restaurants');

                return restaurants;
            })
            .catch(() => {
                return eatDB.then(db  => {
                    const index = db.transaction('restaurants').objectStore('restaurants').index('id');

                    return index.getAll().then(json_data => json_data);
                })
                .catch(err => {
                    throw err;
                })
            })
    },

    fetchRestaurantReviews() {
        return fetch(`${this.BASE_URL}/reviews`)
            .then(response => response.json())
            .then(reviews => {
                storeLocal(reviews, 'reviews');

                return reviews;
            })
            .catch(() => {
                return eatDB.then(db  => {
                    const index = db.transaction('reviews').objectStore('reviews').index('id');

                    return index.getAll().then(json_data => json_data);
                })
                .catch(err => {
                    throw err;
                })
            })
    },

    fetchRestaurantById(id) {
        return fetch(`${this.BASE_URL}/restaurants/${id}`)
            .then(response => response.json())
            .catch(() => {
                return eatDB.then(db  => {
                    return db.transaction('restaurants').objectStore('restaurants').get(id);
                })
                .catch(err => {
                    throw err;
                })
            });
    },

    fetchRestaurantReviewsById(id) {
        return fetch(`${this.BASE_URL}/reviews/?restaurant_id=${id}`)
            .then(response => response.json())
            .catch(() => {
                return eatDB.then(db  => {
                    return db.transaction('reviews').objectStore('reviews').get(id);
                })
                .catch(err => {
                    throw err;
                })
            });
    },

    fetchRestaurantByCuisine(cuisine) {
        return this.fetchRestaurants()
            .then(restaurants => {
                return restaurants.filter(restaurant => restaurant.cuisine_type === cuisine);
            })
    },

    fetchRestaurantByNeighborhood(neighborhood) {
        return this.fetchRestaurants()
            .then(restaurants => {
                return restaurants.filter(restaurant => restaurant.neighborhood === neighborhood);
            })
    },

    fetchRestaurantByCuisineAndNeighborhood(cuisine = 'all', neighborhood = 'all') {
        return this.fetchRestaurants()
            .then(restaurants => {
                if (cuisine === 'all' && neighborhood === 'all') {
                    return restaurants;
                } else if (cuisine === 'all') {
                    return restaurants.filter(restaurant => restaurant.neighborhood === neighborhood);
                } else if (neighborhood === 'all') {
                    return restaurants.filter(restaurant => restaurant.cuisine_type === cuisine);
                }
                return restaurants.filter(restaurant => restaurant.cuisine_type === cuisine && restaurant.neighborhood === neighborhood);
            })
    },

    fetchNeighborhoods() {
        return this.fetchRestaurants()
            .then(restaurants => {
                const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
                return neighborhoods.filter((v, i) => neighborhoods.indexOf(v) === i);
            })
    },

    fetchCuisines() {
        return this.fetchRestaurants()
            .then(restaurants => {
                const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
                return cuisines.filter((v, i) => cuisines.indexOf(v) === i);
            })
    },

    urlForRestaurant(restaurant) {
        return (`./restaurant.html?id=${restaurant.id}`);
    },

    imageUrlForRestaurant(restaurant) {
        return (`/img/${restaurant.photograph || restaurant.id}`); // NB: Casa Enrique is missing the photograph param in the api
    },

    mapMarkerForRestaurant(restaurant, map) {
        // https://leafletjs.com/reference-1.3.0.html#marker
        const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng], {
            title: restaurant.name,
            alt: restaurant.name,
            url: this.urlForRestaurant(restaurant)
        })
        marker.addTo(newMap);
        return marker;
    },
}
