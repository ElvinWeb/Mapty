"use strict";

const form = document.querySelector(".form");
const loading = document.querySelector(".loading");
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
  #editWorkout;

  constructor() {
    this.workoutMarkers = {};
    //Get user's current position
    this._getPosition();
    //Get data from local storage
    this._getLocalStorage();
    //Delete all button visibility
    this._deleteAllButtonVisibility();
    //Attach event handlers
    form.addEventListener(
      "submit",
      function (e) {
        this._newWorkout(e);
      }.bind(this)
    );
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
        if (e.target.classList.contains("workout__edit--btn")) {
          this._editWorkout(e);
        }
      }.bind(this)
    );
  }
  _getPosition() {
    loading.style.display = "grid";
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          toastr["error"]("Couldn't get your current position!!");
          toastr.options = {
            closeButton: false,
            debug: false,
            newestOnTop: false,
            progressBar: true,
            positionClass: "toast-top-right",
            preventDuplicates: false,
            onclick: null,
            showDuration: "300",
            hideDuration: "1000",
            timeOut: "5000",
            extendedTimeOut: "1000",
            showEasing: "swing",
            hideEasing: "linear",
            showMethod: "fadeIn",
            hideMethod: "fadeOut",
          };
        }
      );
    }
    loading.style.display = "none";
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
    e.preventDefault();

    //Helper functions
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));
    const allPostive = (...inputs) => inputs.every((inp) => inp > 0);

    if (this.#editWorkout) {
      this._updateWorkout();
      this._infoNotification();
    } else {
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
        ) {
          this._errorNotification("Please enter valid inputs");
          return;
        } else {
          workout = new Running(clickedCoords, distance, duration, cadence);
        }
      }
      //If workout cycling, create the cycling object
      if (type === "cycling") {
        const elevation = +inputElevation.value;

        if (
          !validInputs(distance, duration, elevation) ||
          !allPostive(distance, duration, elevation)
        ) {
          this._errorNotification("Please enter valid inputs");
          return;
        } else {
          workout = new Cycling(clickedCoords, distance, duration, elevation);
        }
      }
      //Add new object to workout array
      this.#workouts.push(workout);

      //Render workouts on map as marker
      this._renderWorkoutMarker(workout, location);

      //Render workout on the list
      this._renderWorkout(workout, location);

      //Clear input fields and hide form
      this._hideForm();

      this._successNotification();

      //Set local storage to all workouts
      this._setLocalStorage();

      //Delete all button visibility
      this._deleteAllButtonVisibility();
    }
  }
  _successNotification() {
    toastr["success"]("New Workout has been created successfully");
    toastr.options = {
      closeButton: false,
      debug: false,
      newestOnTop: false,
      progressBar: true,
      positionClass: "toast-top-right",
      preventDuplicates: false,
      onclick: null,
      showDuration: "300",
      hideDuration: "1000",
      timeOut: "5000",
      extendedTimeOut: "1000",
      showEasing: "swing",
      hideEasing: "linear",
      showMethod: "fadeIn",
      hideMethod: "fadeOut",
    };
  }
  _infoNotification() {
    toastr["info"]("Workout has updated!");
    toastr.options = {
      closeButton: false,
      debug: false,
      newestOnTop: false,
      progressBar: true,
      positionClass: "toast-top-right",
      preventDuplicates: false,
      onclick: null,
      showDuration: "300",
      hideDuration: "1000",
      timeOut: "5000",
      extendedTimeOut: "1000",
      showEasing: "swing",
      hideEasing: "linear",
      showMethod: "fadeIn",
      hideMethod: "fadeOut",
    };
  }
  _errorNotification(message) {
    toastr["error"](message);
    toastr.options = {
      closeButton: false,
      debug: false,
      newestOnTop: false,
      progressBar: true,
      positionClass: "toast-top-right",
      preventDuplicates: false,
      onclick: null,
      showDuration: "300",
      hideDuration: "1000",
      timeOut: "5000",
      extendedTimeOut: "1000",
      showEasing: "swing",
      hideEasing: "linear",
      showMethod: "fadeIn",
      hideMethod: "fadeOut",
    };
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
            <span class="workout__value">${
              workout.pace === undefined ? " " : workout.pace.toFixed(1)
            }</span>
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
    //Toastr Error notification
    this._errorNotification("Workout has removed!");
    //Update changes in local storage
    this._setLocalStorage();
    //Delete all button visibility
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
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete all!",
    }).then((result) => {
      if (result.isConfirmed) {
        //Clear the workouts array
        this.#workouts = [];
        //Remove all workout markers on the map
        for (const id in this.workoutMarkers) {
          this._removeWorkoutMarker(id);
        }
        //Remove all workout elements from the UI
        const workoutElements = document.querySelectorAll(".workout");
        workoutElements.forEach((workout) => workout.remove());
        //Clear the local storage
        this._setLocalStorage();
        //Point Delete all button visibility
        this._deleteAllButtonVisibility();

        Swal.fire({
          title: "Deleted!",
          text: "Your all workouts has been deleted.",
          icon: "success",
        });
      }
    });
  }
  _deleteAllButtonVisibility() {
    if (this.#workouts.length >= 2) {
      deleteAllButton.style.display = "block"; // Show the button
    } else {
      deleteAllButton.style.display = "none"; // Hide the button
    }
  }
  _editWorkout(e) {
    e.preventDefault();

    const workoutElement = e.target.closest(".workout");
    const workoutId = workoutElement.dataset.id;

    if (!workoutElement) return;
    const wantedIndex = this.#workouts.findIndex(
      (work) => work.id === workoutId
    );
    const wantedWorkout = this.#workouts[wantedIndex];

    //Rendering the updated workout from values
    inputType.value = wantedWorkout.type;
    inputDistance.value = wantedWorkout.distance;
    inputDuration.value = wantedWorkout.duration;

    if (wantedWorkout.type === "running") {
      inputElevation.value = "";
      inputCadence.value = wantedWorkout.cadence;
      inputElevation.closest(".form__row").classList.add("form__row--hidden");
      inputCadence.closest(".form__row").classList.remove("form__row--hidden");
    } else if (wantedWorkout.type === "cycling") {
      inputCadence.value = "";
      inputElevation.value = wantedWorkout.elevationGain;
      inputCadence.closest(".form__row").classList.add("form__row--hidden");
      inputElevation
        .closest(".form__row")
        .classList.remove("form__row--hidden");
    }

    // Set the edited workout as the current edit workout
    this.#editWorkout = wantedWorkout;

    //Show the form
    this._showForm();
  }
  _updateWorkout() {
    if (!this.#editWorkout) {
      this._errorNotification("No workout to update.");
      return;
    }

    const editedWorkoutId = this.#editWorkout.id;
    const workoutIndex = this.#workouts.findIndex(
      (work) => work.id === editedWorkoutId
    );
    if (workoutIndex === -1) {
      console.error("Workout not found.");
      return;
    }
    //Setting the new workout values to the updated workout
    const typeValue = inputType.value;
    const distanceValue = +inputDistance.value;
    const durationValue = +inputDuration.value;

    this.#workouts[workoutIndex].type = typeValue;
    this.#workouts[workoutIndex].distance = distanceValue;
    this.#workouts[workoutIndex].duration = durationValue;

    if (typeValue === "running") {
      this.#workouts[workoutIndex].cadence = +inputCadence.value;
    } else if (typeValue === "cycling") {
      this.#workouts[workoutIndex].elevationGain = +inputElevation.value;
    }

    //Update the workout in the list and on the map
    this._removeWorkoutMarker(editedWorkoutId);
    this._renderWorkoutMarker(this.#workouts[workoutIndex]);
    const workoutElement = document.querySelector(
      `[data-id="${editedWorkoutId}"]`
    );
    if (workoutElement) {
      workoutElement.remove();
    }
    this._renderWorkout(this.#workouts[workoutIndex]);

    //Hide the form
    this._hideForm();

    //Update local storage with the updated workouts
    this._setLocalStorage();

    //Clear the edit workout flag
    this.#editWorkout = null;
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
