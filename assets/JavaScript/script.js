"use strict";

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const deleteAllButton = document.querySelector(".delete__all--btn");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

//Application Arcitecture
class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 14;
  #workouts = [];

  constructor() {
    this.workoutMarkers = {};
    //Get user's current position
    this._getPosition();
    //Get data from local storage
    this._getLocalStorage();
    //Delete all button visibility
    this._deleteAllButtonVisibility();
    //Attach event handlers
    form.addEventListener("submit", this._newWorkout.bind(this));
    inputType.addEventListener("change", this._toggleElevationField);
    deleteAllButton.addEventListener(
      "click",
      this._removeAllWorkouts.bind(this)
    );
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
    containerWorkouts.addEventListener(
      "click",
      function (e) {
        if (e.target.classList.contains("workout__delete--btn")) {
          this._removeWorkout(e);
        }
      }.bind(this)
    );
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("Error!");
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //Handling clicks on the map
    this.#map.on("click", this._showForm.bind(this));

    this.#workouts.forEach((work) => {
      this._renderWorkoutMarker(work);
    });
  }
  _showForm(e) {
    this.#mapEvent = e;
    form.classList.remove("hidden");
    inputDistance.focus();
  }
  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }
  _newWorkout(e) {
    //Helper functions
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));

    const allPostive = (...inputs) => inputs.every((inp) => inp >= 0);

    e.preventDefault();

    //Get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    const clickedCoords = [lat, lng];
    let workout;

    //If workout running, create the running object
    if (type === "running") {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPostive(distance, duration, cadence)
      )
        return alert("Please enter valid inputs");

      workout = new Running(clickedCoords, distance, duration, cadence);
    }
    //If workout cycling, create the cycling object
    if (type === "cycling") {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPostive(distance, duration, elevation)
      )
        return alert("Please enter valid inputs");

      workout = new Cycling(clickedCoords, distance, duration, elevation);
    }

    //Add new object to workout array
    this.#workouts.push(workout);

    //Render workouts on map as marker
    this._renderWorkoutMarker(workout, location);

    //Render workout on the list
    this._renderWorkout(workout, location);

    //Clear input fields and hide form
    this._hideForm();

    //Set local storage to all workouts
    this._setLocalStorage();
  }
  _renderWorkoutMarker(workout) {
    const workoutMarker = L.marker(workout.coords)
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
        `${workout.type === "running" ? "🏃" : "🚴‍♀️"} ${workout.description}`
      )
      .openPopup();

    this.workoutMarkers[workout.id] = workoutMarker;
  }
  _renderWorkout(workout) {
    let workoutHtml = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <div class="workout__title">
          <h4 class="workout__head">${workout.description}</h4>
          <div class="workout__buttons">
              <button class="workout__edit">
                <i class="fa-solid fa-pen-to-square workout__edit--btn"></i>
              </button>
              <button class="workout__delete"> 
                <i class="fa-solid fa-trash workout__delete--btn"></i>
              </button>
          </div>
        </div>
        <div class="workout__details">
            <span class="workout__icon">${
              workout.type === "running" ? "🏃" : "🚴‍♀️"
            } </span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === "running") {
      workoutHtml += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">👟</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
      `;
    }
    if (workout.type === "cycling") {
      workoutHtml += `
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
    }

    form.insertAdjacentHTML("afterend", workoutHtml);
  }
  _removeWorkout(e) {
    const workoutElement = e.target.closest(".workout");
    const workoutId = workoutElement.dataset.id;
    if (!workoutElement) return;

    const wantedIndex = this.#workouts.findIndex(
      (work) => work.id === workoutId
    );
    //Remove workout from array
    this.#workouts.splice(wantedIndex, 1);
    //Remove workout from UI
    workoutElement.remove();
    //Remove workout marker on the map
    this._removeWorkoutMarker(workoutId);
    //Update changes in local storage
    this._setLocalStorage();
    //Point Delete all button visibility
    this._deleteAllButtonVisibility();
  }
  _removeWorkoutMarker(workoutId) {
    const workoutMarker = this.workoutMarkers[workoutId];

    //Remove workout marker on the map and from the workoutMarkers object
    if (workoutMarker) {
      workoutMarker.remove();
      delete this.workoutMarkers[workoutId];
    }
  }
  _removeAllWorkouts() {
    if (confirm("Are you sure you want to delete all workouts?")) {
      //Clear the workouts array
      this.#workouts = [];
      //Remove all workout markers on the map
      for (const id in this.workoutMarkers) {
        this._removeWorkoutMarker(id);
      }
      //Clear the local storage
      this._setLocalStorage();
      //Remove all workout elements from the UI
      const workoutElements = document.querySelectorAll(".workout");
      workoutElements.forEach((workout) => workout.remove());

      //Point Delete all button visibility
      this._deleteAllButtonVisibility();
    } else {
      console.log("Cancelled.");
    }
  }
  _deleteAllButtonVisibility() {
    if (this.#workouts.length >= 2) {
      deleteAllButton.classList.add("show"); // Show the button
    } else {
      deleteAllButton.classList.remove("show"); // Hide the button
    }
  }
  _hideForm() {
    //prettier-ignore
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = "";
    form.style.display = "none";
    form.classList.add("hidden");

    setTimeout(() => (form.style.display = "grid"), 1000);
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest(".workout");
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
  }
  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const workoutsData = JSON.parse(localStorage.getItem("workouts"));
    if (!workoutsData) return;
    this.#workouts = workoutsData;

    this.#workouts.forEach((workout) => {
      this._renderWorkout(workout);
    });
  }
  _reset() {
    localStorage.removeItem("workouts");
    location.reload();
  }
}
class Workout {
  #api_key = "df6862e91d0eedbace79be57aa8f159f";
  date = new Date();
  id = (Date.now() + "").slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    //prettier-ignore
    const months = ["January", "February", "March", "April", "May", "June", "July", 
    "August", "September", "October", "November","December",];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()} `;

    return this.description;
  }
  _getLocation() {
    let api_url = "http://api.positionstack.com/v1/reverse";
    let strCoords = `${this.coords[0]},${this.coords[1]}`;
    let request_url = `${api_url}?access_key=${
      this.#api_key
    }&query=${strCoords}`;

    fetch(request_url)
      .then((res) => res.json())
      .then((data) => {
        this.locationName = data.data[0].name;
        console.log(this.locationName);
      });
    return this.locationName;
  }
}
class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
    this._getLocation();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}
class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
    this._getLocation();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

const app = new App();

console.log(app);
