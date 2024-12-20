import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { auth } from "../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import { loggedin } from "../../Redux/logSlice";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import './Login.css'
import { hideLoader, showLoader } from "../../Redux/loaderSlice";

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [passwordVisible, setPasswordVisible] = useState(false);

  const loader = useSelector((state)=> state.loaderReducer.loading)
  console.log("laoder",loader);
 

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: Yup.object({
      email: Yup.string().email("Invalid email address").required("Required"),
      password: Yup.string().min(8, "Must be 8 characters").required("Required"),
    }),
    onSubmit: (values) => {
      dispatch(showLoader())
      const { email, password } = values;
     
      signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          const user = userCredential.user;
          toast.success("Successfully logged in!");
          // console.log(user);
          dispatch(loggedin());
        })
        .then(() => {
          navigate("/");
        })
        .catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;
          toast.error(errorMessage);
          console.log(errorCode, errorMessage);
        })
        dispatch(hideLoader())
    },
  });

  return (
    <>
    <div className="login-container">
      <h2 className="login-title">Log-in Form</h2>
      <form className="login-form" onSubmit={formik.handleSubmit}>
        <label className="login-label" htmlFor="email">Email Address</label>
        <input
          id="email"
          className="login-input"
          name="email"
          type="email"
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          value={formik.values.email}
        />
        {formik.touched.email && formik.errors.email ? (
          <div className="error-message">{formik.errors.email}</div>
        ) : null}

        <label className="login-label" htmlFor="password">Password</label>
        <div className="password-wrapper">
          <input
            id="password"
            className="login-input"
            type={passwordVisible ? "text" : "password"}
            name="password"
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            value={formik.values.password}
          />
          <span
            className="password-toggle"
            onClick={() => setPasswordVisible(!passwordVisible)}
          >
            {passwordVisible ? <FaEyeSlash /> : <FaEye />}
          </span>
        </div>
        {formik.touched.password && formik.errors.password ? (
          <div className="error-message">{formik.errors.password}</div>
        ) : null}

        <button className="login-button" type="submit">Submit</button>

        <p className="login-footer">
          Forgot password? <NavLink className="login-link" to="/reset">Reset-Password</NavLink>
        </p>
        <p className="login-footer">
          Don't have an account? <NavLink className="login-link" to="/signup">Sign Up</NavLink>
        </p>
      </form>
      <ToastContainer />
    </div>
    </>
  );
};

export default Login;