/* globals newMap, L, idb */

const eatDB = idb.open('UdacityEats', '4', upgradeDb => {
    const restaurants     = upgradeDb.createObjectStore('restaurants', {keyPath : 'id'});
    const reviews         = upgradeDb.createObjectStore('reviews', {keyPath : 'id'});
    const background_sync = upgradeDb.createObjectStore('background_sync', { autoIncrement : true, keyPath: 'id' });
    restaurants.createIndex('id', 'id');
    reviews.createIndex('id', 'id');
    reviews.createIndex('restaurant_id', 'restaurant_id');
    background_sync.createIndex('id', 'id');
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

const deleteRecord = (id, store_name) => {
    eatDB.then(db => {
        const transaction = db.transaction(store_name, 'readwrite');
        const store       = transaction.objectStore(store_name);
        store.delete(parseInt(id));

        return transaction.complete;
    });
}

const updateRecord = (record, store_name) => {
    eatDB.then(db => {
        const transaction = db.transaction(store_name, 'readwrite');
        const store       = transaction.objectStore(store_name);
        store.put(record);

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

    postReview(review_data) {
        return fetch(`${this.BASE_URL}/reviews`, {
                method : 'POST',
                body   : JSON.stringify(review_data)
            })
            .then(response => response.json())
            .then(review => {
                storeLocal([review], 'reviews');
                return Promise.resolve(review);
            })
            .catch(() => {
                const pending_data = {
                    url    : `${this.BASE_URL}/reviews`,
                    method : 'POST',
                    body   : JSON.stringify(review_data),
                    store  : 'reviews',
                };
                storeLocal([pending_data], 'background_sync');

                return Promise.resolve(review_data);
            });
    },

    putReview(review_id, review_data) {
        return fetch(`${this.BASE_URL}/reviews/${review_id}`, {
                method : 'PUT',
                body   : JSON.stringify(review_data)
            })
            .then(response => response.json())
            .then(review => {
                this.updateRecord(review, 'reviews');

                return Promise.resolve(review);
            })
            .catch(() => {
                const pending_data = {
                    url    : `${this.BASE_URL}/reviews/${review_id}`,
                    method : 'PUT',
                    body   : JSON.stringify(review_data),
                    store  : 'reviews',
                };
                storeLocal([pending_data], 'background_sync');

                return Promise.resolve(review_data);
            });
    },

    deleteReview(review_id) {
        fetch(`${this.BASE_URL}/reviews/${review_id}`, { method : 'DELETE' })
            .then(() => {
                deleteRecord(review_id, 'reviews');
            })
            .catch(err => {
                const pending_data = {
                    url    : `${this.BASE_URL}/reviews/${review_id}`,
                    method : 'DELETE',
                    body   : '',
                    store  : 'reviews',
                    id     : review_id,
                };
                storeLocal([pending_data], 'background_sync');
                return Promise.resolve(err);
            });
    },

    toggleFavorite(restaurant_id, is_favorite) {
        return fetch(`${this.BASE_URL}/restaurants/${restaurant_id}/?is_favorite=${is_favorite}`, {method: 'PUT'})
            .catch(err => {
                const pending_data = {
                    url    : `${this.BASE_URL}/restaurants/${restaurant_id}/?is_favorite=${is_favorite}`,
                    method : 'PUT',
                    body   : '',
                    store  : 'restaurants',
                };
                storeLocal([pending_data], 'restaurants');

                return Promise.resolve(err);
            });
    },

    doPendingFetch() {
        if (!navigator.onLine) {
            return;
        }
        eatDB.then(db => {
                const index = db.transaction('background_sync').objectStore('background_sync').index('id');
                return index.getAll().then(json_data => json_data);
            })
            .then(pending_fetches => {
                pending_fetches.forEach(pending_fetch => {
                    fetch(pending_fetch.url, {
                            method : pending_fetch.method,
                            body   : pending_fetch.body,
                        })
                        .then(response => response.json())
                        .then(json_response => {
                            deleteRecord(pending_fetch.id, 'background_sync');

                            if (pending_fetch.method === 'POST') {
                                storeLocal([json_response], pending_fetch.store);
                            } else if (pending_fetch.method === 'DELETE') {
                                deleteRecord(json_response.id, json_response.store);
                            } else if (pending_fetch.method === 'PUT') {
                                updateRecord(json_response, pending_fetch.store);
                            }
                        })
                })
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