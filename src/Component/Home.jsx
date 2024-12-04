import React, { useEffect, useState } from "react";
import axios from "axios";
import { debounce, truncate } from "lodash";
import Select from "react-select";
import Modal from "react-modal";
import { NavLink, useNavigate } from "react-router-dom";
import "./Home.css";
import { useDispatch, useSelector } from "react-redux";
import {
  arrayUnion,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { loggedout } from "../Redux/counterSlice";
import { onAuthStateChanged } from "firebase/auth";

import { Pie } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const Home = () => {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState({ common: [], branded: [] });
  const [selectItem, setSelectItem] = useState({});
  const [modal, setModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectquantity, setSelectquantity] = useState(1);
  const [SelectedFoodData, setSelectedFoodData] = useState({ foods: [] });
  const [selectCategory, setSelectCategory] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [logData, setLogdata] = useState();
  const [loading, setloading] = useState(false);

  // API Data on serch bar

  const debouncedFetchSuggestions = debounce(async (query) => {
    try {
      const response = await axios.get(
        `https://trackapi.nutritionix.com/v2/search/instant/?query=${query}`,
        {
          headers: {
            "x-app-id": import.meta.env.VITE_NUTRITIONIX_APP_ID,
            "x-app-key": import.meta.env.VITE_NUTRITIONIX_APP_KEY,
            "Content-Type": "application/json",
          },
        }
      );
      setSuggestions(response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, 300);

  //push method for nutrients

  const foodData = async (select) => {
    try {
      const response = await axios.post(
        `https://trackapi.nutritionix.com/v2/natural/nutrients`,
        {
          query: `${select}`,
        },
        {
          headers: {
            "x-app-id": import.meta.env.VITE_NUTRITIONIX_APP_ID,
            "x-app-key": import.meta.env.VITE_NUTRITIONIX_APP_KEY,
            "Content-Type": "application/json",
          },
        }
      );
      setSelectedFoodData(response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleInputChange = (newInputValue) => {
    setInputValue(newInputValue);

    if (newInputValue) {
      debouncedFetchSuggestions(newInputValue);
    }
    // else {
    //   setSuggestions({ common: [], branded: [] });
    // }
  };

  const groupedOptions = [
    {
      label: "Common Foods",
      options: suggestions.common.map((element) => ({
        value: element.tag_id,
        label: `${element.food_name}`,
        category: "common",
      })),
    },
    {
      label: "Branded Foods",
      options: suggestions.branded.map((element) => ({
        value: element.nix_item_id,
        label: `${element.brand_name_item_name} - ${element.nf_calories} kcal`,
        category: "Branded",
      })),
    },
  ];

  const handleSelectChange = async (selectedOption) => {
    setSelectItem(selectedOption);
    await foodData(selectedOption.label);
    setModal(true);
  };

  // Add Meal data

  const handleModalData = async () => {
    try {
      console.log("inside modal");
      const user = auth.currentUser;
      const data = {
        name: selectItem.label,
        calories: Math.round(calculateCalories),
      };
      if (user) {
        const userId = user.uid;
        const date = new Date().toISOString().split("T")[0];
        const docRef = doc(db, "users", userId, "dailyLogs", date);
        const categorisedData = { [selectCategory]: arrayUnion(data) };

        await setDoc(docRef, categorisedData, { merge: true });

        console.log("Data saved successfully!");
      } else {
        console.log("User not authenticated.");
      }
    } catch (error) {
      console.error("Error saving data:", error);
    }
    setModal(false);
  };

  // Get meal data

  // console.log("auth", auth);



  
  const handleGetData = async (user) => {
    try {
      // console.log("user", user)

      if (!user) {
        console.log("User is not authenticated");
        setloading(false);
        return;
      }
      const userId = user.uid;

      const date = new Date().toISOString().split("T")[0];

      const docRef = doc(db, "users", userId, "dailyLogs", date);

      const sanpdata = onSnapshot(docRef, (docRef) => {
        console.log(docRef.data());
      });
      //    const unsub = onSnapshot(docRef, (doc) => {
      //     console.log("Current data: ", doc.data());
      // });
      console.log("snapdata", sanpdata);
      const docSnap = await getDoc(docRef);
      console.log("snapdata", docSnap);

      if (docSnap.exists()) {
        const mealData = docSnap.data();
        console.log("mealdata", mealData);
        setLogdata(mealData);
      } else {
        setLogdata({});
      }
    } catch (error) {
      console.error("error fetching data", error);
    } finally {
      setloading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // console.log("User authenticated:", user);
        setloading(true);
        handleGetData(user); // Pass the user object to fetch data
      } else {
        console.log("No user authenticated");
        setloading(false);
      }
    });

    return () => unsubscribe(); // Clean up the listener on unmount
  }, []);

  const calculateCalories =
    SelectedFoodData.foods.length > 0
      ? (SelectedFoodData.foods[0].nf_calories /
          SelectedFoodData.foods[0].serving_weight_grams) *
        selectquantity *
        quantity
      : "no data";

  const handleLogout = () => {
    dispatch(loggedout());
    navigate("/");
  };

  const breakfastCalorie = logData?.Breakfast?.length > 0 ?logData.Breakfast.reduce(
    (acc, item) => acc + item.calories,0):0;

  const lunchCalorie =logData?.Lunch?.length > 0 ?  logData.Lunch.reduce(
    (total, item) => total + item.calories,
    0
  ):0;
  const snackCalorie =  logData?.Snack?.length > 0 ?  logData.Snack.reduce((total, item) => total + item.calories, 0) : 0;

  const dinnerCalorie= logData?.Dinner?.length > 0 ? logData.Dinner.reduce((total, item) => total + item.calories, 0):0;
  const totalCalories = breakfastCalorie + lunchCalorie + snackCalorie +dinnerCalorie


  const chartData = {
    labels: ["BreakFast", "Lunch","Snack","Dinner"],
    datasets: [
      {
        data: [breakfastCalorie, lunchCalorie,snackCalorie,dinnerCalorie],
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(54, 162, 235, 0.2)',
          'rgba(115, 212, 132, 0.2)',
          'rgba(175, 150, 163, 0.2)',
        ],
        borderWidth: 1,
      },
    ],
  };

//  console.log("breakfast",breakfastCalorie);
//   console.log("total calories", totalCalories);

  console.log("logdata", logData);
  return (
    <>
      <button type="submit" onClick={handleLogout}>
        LogOut
      </button>
      {/* <p>Total calorie ={totalCalories}</p> */}
      <NavLink to={"/dashboard"}> Dashboard</NavLink>
      <h1>Nutrition-Tracker</h1>

      <Select
        options={groupedOptions}
        onChange={handleSelectChange}
        onInputChange={handleInputChange}
        placeholder="Select a food item"
      />

      <Modal
        isOpen={modal}
        style={{
          overlay: { backgroundColor: "rgba(0, 0, 0, 0.5)" },
          content: {
            background: "#d8e5f7",
            padding: "20px",
            width: "400px",
            marginLeft: "auto",
            borderRadius: "10px",
          },
        }}
      >
        <h2>Your Meal</h2>
        <button
          onClick={() => setModal(false)}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            border: "none",
            backgroundColor: "blue",
            fontSize: "20px",
            cursor: "pointer",
          }}
        >
          x
        </button>

        <b>{selectItem.label}</b>

        <input
          type="text"
          placeholder="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          step="1"
        />

        <br />

        <select
          onChange={(e) => {
            const selectedMeasure = e.target.value;

            setSelectquantity(selectedMeasure);
          }}
        >
          {SelectedFoodData.foods.map((food, foodIndex) =>
            food.alt_measures.map((measure, index) => (
              <option
                key={`${foodIndex}-${index}`}
                value={measure.serving_weight}
              >
                {` ${measure.measure} `}
              </option>
            ))
          )}
        </select>
        <p>Calorie:{Math.round(calculateCalories)}</p>

        <br />
        <select
          name="meal-category"
          id="meal-category"
          onChange={(e) => {
            const selectmealcategory = e.target.value;
            setSelectCategory(selectmealcategory);
          }}
        >
          {" "}
          <option value="" selected disabled hidden>
            Choose here
          </option>
          <option value="Breakfast">Breakfast</option>
          <option value="Lunch">Lunch</option>
          <option value="Snack">Snack</option>
          <option value="Dinner">Dinner</option>
        </select>
        <button onClick={handleModalData}> Add Meal</button>

      
      </Modal>

      <Pie data={chartData}  style={{ marginRight:"20px", marginTop:"50px"}}></Pie>
      <h3> Total Calorie Consumption :{totalCalories}</h3>
      <br />
      <span>Min: 0</span>
      <input
        id="typeinp"
        type="range"
        min="0"
        max="2000"
        // value={totalCalories}
        // onChange={ totalcalorieHandler()}
      />
      <span>Max:2000</span>

      <h3>Breakfast</h3>

      <ul>
        {logData?.Breakfast?.length > 0 ? (
          logData.Breakfast.map((item, index) => (
            <li key={index}>
              {item.name} - {item.calories} kcal
            </li>
          ))
        ) : (
          <li>No breakfast items</li>
        )}
      </ul>

      <h3>Lunch</h3>
      <ul>
        {logData?.Lunch?.length > 0 ? (
          logData.Lunch.map((item, index) => (
            <li key={index}>
              {item.name} - {item.calories} kcal
            </li>
          ))
        ) : (
          <li>No lunch items</li>
        )}
      </ul>

      <h3>Snacks</h3>
      <ul>
        {logData?.Snack?.length > 0 ? (
          logData.Snack.map((item, index) => (
            <li key={index}>
              {item.name} - {item.calories} kcal
            </li>
          ))
        ) : (
          <li>No snacks item</li>
        )}
      </ul>

      <h3>Dinner</h3>
      <ul>
        {logData?.Dinner?.length > 0 ? (
          logData.Dinner.map((item, index) => (
            <li key={index}>
              {item.name} - {item.calories} kcal
            </li>
          ))
        ) : (
          <li>No dinner item</li>
        )}
      </ul>

     
    </>
  );
};

export default Home;
