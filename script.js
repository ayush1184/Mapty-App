"use strict";

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

/////////////////////////////////////////////////////////////////////////
// Lecture -- 1  : HOW TO PLAN A WEB PROJECT

/////////////////////////////////////////////////////////////////////////
// Lecture -- 2  : USING THE GEOLOCATION API
/*
navigator.geolocation.getCurrentPosition(callback 1 ,callback 2)
--> Successful-event callback 1 : It will be called on successfully getting the current position..
--> It requires a parameter that has info about position...
--> unsuccessful-event callback 2 : It will be called if any error will occur in the process of getting the current position..

--> We can get our position url on google maps by 
https://www.google.com/maps/@(latitude),(longitude)  
*/

class Workout {
  date = new Date();
  id = (new Date().getTime() + ``).slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    // this.date = ...
    // this.id = ...
    this.coords = coords; // [lat,lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${
      this.type[0].toUpperCase() + this.type.slice(1).toLowerCase()
    } on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = `running`;
  name;

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;

    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min/km
    this.pace = +this.duration / +this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = `cycling`;
  name;

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    // this.type = `cycling`;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 398, 782, 2189);
// const cycling1 = new Cycling([39, -12], 783, 637, 813);
// console.log(run1, cycling1);

// Application ARCHITECTURE
class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 16.5;

  constructor() {
    // this.#workouts = [];
    // Get User Position
    this._getPosition();

    // Attaching Event Handlers
    form.addEventListener(`submit`, this._newWorkout.bind(this));
    inputType.addEventListener(`change`, this._toggleElevationField);
    containerWorkouts.addEventListener(`click`, this._moveToPopup.bind(this));

    // Getting the data from localStorage
    this._getLocalStorage();
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert(`Could not get your location...`);
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map(`map`).setView(coords, this.#mapZoomLevel); // the first arguments in setView method is for the coords and second is for zoom index...

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling click on map...
    this.#map.on(`click`, this._showForm.bind(this));

    // for marking the points on the map after the full loading of map..`
    this.#workouts.forEach((work) => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove(`hidden`);
    inputDistance.focus();
  }

  _hideForm() {
    // Empty the input
    // prettier-ignore
    inputCadence.value = inputDistance.value = inputDuration.value = inputElevation.value = ``;

    inputCadence.blur();
    inputDistance.focus();
    form.classList.add(`hidden`);
  }

  _toggleElevationField(e) {
    e.preventDefault();

    inputCadence.closest(`.form__row`).classList.toggle(`form__row--hidden`);
    inputElevation.closest(`.form__row`).classList.toggle(`form__row--hidden`);
  }

  _newWorkout(e) {
    e.preventDefault();

    // get the data from the form...
    const type = inputType.value;
    const duration = +inputDuration.value;
    const distance = +inputDistance.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // check if data is valid
    const isValid = (...inputs) => inputs.every((inp) => Number.isFinite(inp));
    const isPositive = (...inputs) => inputs.every((inp) => inp > 0);

    // If workout is running, create running object
    if (type === `running`) {
      const cadence = +inputCadence.value;
      if (
        // !Number.isFinite(distance)||
        // !Number.isFinite(duration)||
        // !Number.isFinite(cadence)

        !isValid(distance, duration, cadence) ||
        !isPositive(distance, duration, cadence)
      )
        alert(`Input has to be positive numbers only...`);

      workout = new Running([lat, lng], distance, duration, cadence);

      this.#workouts.push(workout);
    }
    // If workout is cycling, create cycling object
    if (type === `cycling`) {
      const elevationGain = +inputElevation.value;
      if (
        !isValid(distance, duration, elevationGain) ||
        !isPositive(distance, duration)
      )
        alert(`Input has to be positive numbers only...`);

      workout = new Cycling([lat, lng], distance, duration, elevationGain);

      this.#workouts.push(workout);
    }
    // Add a new object to the workout array

    // Render Workout on the map
    this._renderWorkoutMarker(workout);

    // Render Workout on list
    this._renderWorkout(workout);

    // Hide the Form + clearing Inputs fields
    this._hideForm();

    // set Local storage to all workout...
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === `running` ? `🏃‍♂️` : `🚴‍♀️`} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === `running` ? `🏃‍♂️` : `🚴‍♀️`
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;
    if (workout.type === `running`)
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
      `;

    if (workout.type === `cycling`)
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
      `;

    // Wrong // workoutsEl.insertAdjacentHTML(`afterbegin`, html);
    form.insertAdjacentHTML(`afterend`, html); // Correct
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest(`.workout`);

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // Using the public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem(`workout`, JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem(`workout`));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach((work) => {
      this._renderWorkout(work);
      // go to load map... this._renderWorkoutMarker(work);
    });
  }

  reset() {
    localStorage.removeItem(`workout`);
    location.reload();
  }
}

const app = new App();

/////////////////////////////////////////////////////////////////////////
// Lecture -- 3  : DISPLAYING A MAP USING LEAFLET LIBRARY
/*
    #ff0 -> Our script file must be at last position in the head bcz we need to work with third Party library and that all other scripts need to be processed first...
    --> we also defer all the scripts file in our HTML, bcz here order in which they gonna execute is very important...
    --> Any variable that is in global scope can be accessed from any script files below it in the HTML...
    --> this.#map = L.map(`map`).setView(coords, this.); // the first arguments in setView method is for the coords and second is for zoom index...
    -->     // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
    --> Another Theme : 
    -->     // L.tileLayer("https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", { // Another Theme 
    */

/////////////////////////////////////////////////////////////////////////
// Lecture -- 4 : DISPLAYING A MAP MARKER
/*
   
   */

/////////////////////////////////////////////////////////////////////////
// Lecture -- 5 : RENDERING WORKOUT INPUT FORM
/*

*/

// for changing btw the elev gain and cadance

/////////////////////////////////////////////////////////////////////////
// Lecture -- 6 : Project Architecture
/*
#ff0 : Revise 1:22:00 to  1:32:00 Lecture of Mapty projects
*/

/////////////////////////////////////////////////////////////////////////
// Lecture -- 7 : REFACTORING FOR PROJECT ARCHITECTURE
/*
      Go to `class App`
      --> In _loadMap method as a callback function in getCurrentPosition function will have this keyword is treated as the regular function call..., So, we must `bind this...
      --> We must add all eventHandlers to constructor function in order to  make the addEventListeners active ...
*/

/////////////////////////////////////////////////////////////////////////
// Lecture -- 8 : MANAGING WORKOUT DATA: CREATING CLASSES
/*
  Go to class Workout  
  
  --> The Workout Class may have the fields date and id as properties by defining them in constructor function...
*/
/////////////////////////////////////////////////////////////////////////
// Lecture -- 9 : CREATING A NEW WORKOUT
/*
  Go to class Workout  
  
  --> The Workout Class may have the fields date and id as properties by defining them in constructor function...
*/

// #ff0 : use of this.type in _setDescription method is useful bcz we have to call them from the child class or by using inheritence...
// #aaccee : revise it 3:06:00 to 3:10:00

/////////////////////////////////////////////////////////////////////////
// Lecture -- 10 : MOVE TO MARKER ON CLICK
/*
  map.setView(coords , zoomLevel, options)
*/
/////////////////////////////////////////////////////////////////////////
// Lecture -- 11 :WORKING WITH LOCALSTORAGE
/*
  --> localStorage is a key--value pair data storage
      --> key must be as string
      --> value must be as string

    --> To convert any JS object to string, there is a method called as #f0f--> JSON.stringify()
    --> To convert any JS string to object, there is a method called as #f0f--> JSON.parse()
    --> It is advised to use localStorage only for a small amount of data...
  localStorage.setItem()
  localStorage.getItem()
  localStorage.removeItem()

  --> Once we load the items from the localStorage then it will give us error on workout.click because we won't be able to get the prototypical inheritence
      --> Reason : When we convert the JS object to string and when we return the JS object back from it, then we will lost the prototypical inheritence...

      --> To reload the or any site we can say 
        #ff0 --> location.reload()
*/

/////////////////////////////////////////////////////////////////////////
// Lecture -- 11 : Final Consideration
/*
  --> Ability to edit a workout;
  --> Ability to delete a workout;
  --> Ability to delete all workouts;

*/
