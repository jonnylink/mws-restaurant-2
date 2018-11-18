/* globals L, ApiHelper, eatDB */
let newMap;
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const UdacityYelpRestaurant = {
    restaurant: undefined,

    init () {
        this.initMap();
    },

    initMap() {
        this.fetchRestaurantFromURL()
            .then(() => {
                newMap = L.map('map', {
                    center: [this.restaurant.latlng.lat, this.restaurant.latlng.lng],
                    zoom: 16,
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

                this.fillBreadcrumb();
                ApiHelper.mapMarkerForRestaurant(this.restaurant, newMap);
            })
            .catch(error => {
                throw error;
            });
    },

    addListeners () {        
        document.querySelector('#favorite-heart').addEventListener('click', () => this.toggleFavorite());
        document.querySelector('#submit-review').addEventListener('click', event => this.postReview(event));
        document.querySelectorAll('.edit-review').forEach(pencil => pencil.addEventListener('click', event => this.renderEditReviewForm(event)));
        document.querySelectorAll('.delete-review').forEach(trash => trash.addEventListener('click', event => this.deleteReview(event)));

        return this;
    },

    toggleFavorite () {
        const will_be_favorite = this.restaurant.isFavorite === 'true' ? 'false' : 'true';
        fetch(`http://localhost:1337/restaurants/${this.restaurant.id}/?is_favorite=${will_be_favorite}`, {
                method: 'PUT'
            })
            .then(() => {
                this.restaurant.isFavorite = will_be_favorite;
                if (will_be_favorite === 'true') {
                    document.querySelector('#favorite-heart').classList.add('favorite');
                } else {
                    document.querySelector('#favorite-heart').classList.remove('favorite');
                }
            })
            .catch(() => {
                // defer submission
            });
    },

    postReview (event) {
        event.preventDefault();
        const form_data = { // could iterate over form.elements, but it's only three fields
            restaurant_id : this.restaurant.id,
            name          : document.getElementById('name').value,
            rating        : parseInt(document.getElementById('rating').value),
            comments      : document.getElementById('comments').value,
        };

        fetch('http://localhost:1337/reviews', {
                method : 'POST',
                body   : JSON.stringify(form_data)
            })
            .then(response => response.json())
            .then(review => {               
                eatDB.then(db => {
                    const transaction = db.transaction('reviews', 'readwrite');
                    const store       = transaction.objectStore('reviews');

                    store.put(review);
                })
                .then(() => {
                    document.getElementById('review-form').reset();
                    const review_node = this.createReviewHTML(review);
                    document.getElementById('reviews-list').append(review_node);
                })
                // add to restaurant.reviews
                // add to idb
            })
            .catch(() => {
                // add review to the page
                // defer submission
            }) 
    },

    putReview (event) {
        event.preventDefault();

        const review_id = event.target.dataset.reviewId;
        const form_data = { 
            name          : document.getElementById('edit-name').value,
            rating        : parseInt(document.getElementById('edit-rating').value),
            comments      : document.getElementById('edit-comments').value,
        };

        fetch(`http://localhost:1337/reviews/${review_id}`, {
                method : 'PUT',
                body   : JSON.stringify(form_data)
            })
            .then(response => response.json())
            .then(review => {
                eatDB.then(db => {
                    const transaction = db.transaction('reviews', 'readwrite');
                    const store       = transaction.objectStore('reviews');

                    store.put(review);
                })
                .then(() => {
                    // remove old review
                    document.getElementById(`review_${review.id}`).remove();
                    const review_node = this.createReviewHTML(review);
                    document.getElementById('reviews-list').append(review_node);
                    
                    // update to restaurant.reviews
                    const update_review_key = this.restaurant.reviews.filter((review_object, review_key) => {
                        if (review_object.id === review.id) {
                            return review_key;
                        }
                    })[0];
                    this.restaurant.reviews[update_review_key] = review;
                })
                .then(() => {
                    document.querySelector(`#review_${review.id} .edit-review`).addEventListener('click', event => this.renderEditReviewForm(event));
                    document.querySelector(`#review_${review.id} .delete-review`).addEventListener('click', event => this.deleteReview(event));
                })
              
            })
            .catch(() => {
                // add review to the page
                // defer submission
            }) 
    },

    deleteReview(event) {
        event.preventDefault();
        const review_id = parseInt(event.target.dataset.reviewId);
        fetch(`http://localhost:1337/reviews/${review_id}`, { method: 'DELETE' })
            .then(() => {
                eatDB.then(db => {
                    const transaction = db.transaction('reviews', 'readwrite');
                    const store       = transaction.objectStore('reviews');

                    store.delete(review_id);
                })
                .then(() => event.target.parentElement.remove());
            })
            .catch(() => {
                // defer action, try again
            })
        
    },

    renderEditReviewForm (event) {
        const open_form  = document.getElementById('edit-review-form'); 
        if (open_form) {
            open_form.remove(); // allow only one form open at a time
        } 

        const review     = this.getReviewById(parseInt(event.target.dataset.reviewId));
        const review_div = event.target.parentElement;
        const form_html  = `
        <form id="edit-review-form">
            <div>
                <input type="text" id="edit-name" aria-label="name" placeholder="Your name" value="${review.name}" required>
            </div>
            <div>
                <input type="number" id="edit-rating" min="1" max="5" aria-label="rating" placeholder="Rating" value="${review.rating}" required>
            </div>
            <div>
                <textarea id="edit-comments" aria-label="edit comments" placeholder="Comments">${review.comments}</textarea>
            </div>
            <button id="edit-review" data-review-id="${review.id}" aria-label="submit edits">Submit Edits</button>
        </form>`;
        const form_node  = document.createRange().createContextualFragment(form_html);
        review_div.append(form_node);
        document.getElementById('edit-name').focus();
        document.getElementById('edit-review').addEventListener('click', event => this.putReview(event));
    },

    // Get current restaurant from page URL.
    fetchRestaurantFromURL() {
        if (this.restaurant) { // restaurant already fetched!
            return Promise.resolve();
        }

        const id = this.getParameterByName('id');
        if (!id) { // no id found in URL
            return Promise.reject('No restaurant id in URL');
        } else {
            return ApiHelper.fetchRestaurantById(id)
                .then(restaurant => {
                    this.restaurant = restaurant;
                    return this.fetchRestaurantReviewFromURL()
                        .then(() => {
                            this.fillRestaurantHTML()
                                .fillReviewsHTML();
                            
                            return Promise.resolve();
                        });
                })
                .then(() => {
                    this.addListeners();
                    
                    return Promise.resolve();
                })
        }
    },

    fetchRestaurantReviewFromURL() {
        if (this.restaurant.reviews) { // restaurant already fetched!            
            return Promise.resolve();
        }

        if (!this.restaurant.id) { // no id found in URL            
            return Promise.reject('No restaurant');
        } else {            
            return ApiHelper.fetchRestaurantReviewsById(this.restaurant.id)
                .then(reviews => {
                    this.restaurant.reviews = reviews;
                    
                    return Promise.resolve();
                });
        }
    },

    // Create restaurant HTML and add it to the webpage
    fillRestaurantHTML() {
        const img_url_fragment = ApiHelper.imageUrlForRestaurant(this.restaurant);
        const hours_html       = this.renderRestaurantHoursHTML();
        const restaurant_html  = `
            <h2 id="restaurant-name">${this.restaurant.name}</h2>
            <div id="favorite-heart" tabindex="2" aria-label="Click to favorite this restaurant." class="favorite">♥</div>
            <img id="restaurant-img" class="restaurant-img ${this.restaurant.is_favorite === 'true' ? 'favorite' : ''}" src="${img_url_fragment}-300.jpg" srcset="${img_url_fragment}-600.jpg 1000w, ${img_url_fragment}-1200.jpg 2000w" alt="classy photo from ${this.restaurant.name}">
            <p id="restaurant-cuisine" tabindex="3">${this.restaurant.cuisine_type}</p>
            <p id="restaurant-address" tabindex="4">${this.restaurant.address}</p>
            <table id="restaurant-hours" tabindex="5">${hours_html}</table>`;
        document.getElementById('restaurant-container').innerHTML = restaurant_html;
        
        return this;
    },

    // Create restaurant operating hours HTML table and add it to the webpage.
    renderRestaurantHoursHTML(operating_hours = this.restaurant.operating_hours) {
        let hours_html = '';
        for (let day in operating_hours) {
            hours_html += `
                <tr>
                    <td>${day}</td>
                    <td>${operating_hours[day]}</td>
                </tr>`;
        }

        return hours_html;
    },

    // Create all reviews HTML and add them to the webpage.
    fillReviewsHTML(reviews = this.restaurant.reviews) {
        const container = document.getElementById('reviews-container');
 
        if (!reviews) {
            const no_reviews = document.createRange().createContextualFragment('<p>No reviews yet!</p>');
            container.appendChild(no_reviews);
            return this;
        }

        const ul = document.getElementById('reviews-list');
        reviews.forEach(review => {
            ul.appendChild(this.createReviewHTML(review));
        });
        container.appendChild(ul);

        return this;
    },

    // Create review HTML and add it to the webpage.
    createReviewHTML(review) {
        const date = new Date(review.updatedAt || new Date());
        const html = `
        <li id="review_${review.id}">
            <span class="delete-review" aria-label="delete review" data-review-id="${review.id}">&#128465;</span>
            <span class="edit-review" aria-label="edit review" data-review-id="${review.id}">&#9998;</span>
            <p>${review.name}</p>
            <p>${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}</p>
            <p>Rating: ${review.rating}</p>
            <p>${review.comments}</p>
        </li>`;

        return document.createRange().createContextualFragment(html);
    },

    // Add restaurant name to the breadcrumb navigation menu
    fillBreadcrumb(restaurant = this.restaurant) {
        const breadcrumb = document.getElementById('breadcrumb');
        const li         = document.createElement('li');
        li.innerHTML     = restaurant.name;
        breadcrumb.appendChild(li);
    },

    // Get a parameter by name from page URL.
    getParameterByName(name, url) {
        if (!url){
            url = window.location.href;
        }

        name = name.replace(/[\[\]]/g, '\\$&');
        const regex   = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`);
        const results = regex.exec(url);

        if (!results){
            return null;
        }

        if (!results[2]){
            return '';
        }

        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    },

    getReviewById(review_id) {
        return this.restaurant.reviews.filter(review => review.id === review_id)[0];
    },
}

document.addEventListener('DOMContentLoaded', () => {
    UdacityYelpRestaurant.init();
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}
