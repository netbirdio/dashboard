"use client";

import { cn } from "@utils/helpers";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { ApiError, SetupRequest } from "@/interfaces/Instance";
import { submitSetup } from "@/utils/unauthenticatedApi";

interface FormData {
  email: string;
  password: string;
  name: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  name?: string;
  general?: string;
}

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/i;

export default function InstanceSetupWizard() {
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    name: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const request: SetupRequest = {
        email: formData.email.trim(),
        password: formData.password,
        name: formData.name.trim(),
      };

      await submitSetup(request);
      setIsSuccess(true);
    } catch (err) {
      const error = err as ApiError;
      let message = "An error occurred. Please try again.";

      switch (error.code) {
        case 400:
          message = "Invalid request. Please check your input.";
          break;
        case 412:
          message = "Setup has already been completed. Redirecting to login...";
          setTimeout(() => (window.location.href = "/"), 2000);
          break;
        case 422:
          message = error.message || "Validation error. Please check your input.";
          break;
        case 500:
          message = "An error occurred. Please try again.";
          break;
        default:
          message = error.message || message;
      }

      setErrors({ general: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isSuccess) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Full page reload to get fresh instance status from API
          window.location.href = "/";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSuccess]);

  const handleInputChange =
    (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  if (isSuccess) {
    return (
      <div className="nb-container">
        <NetBirdLogo />
        <div className="nb-card">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="nb-heading !mb-2">Account Created!</h1>
            <p className="nb-subheading">
              Redirecting to login in {countdown}...
            </p>
            <button
              type="button"
              onClick={() => (window.location.href = "/")}
              className="nb-btn"
            >
              Go to Login
            </button>
          </div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="nb-container">
      <NetBirdLogo />
      <div className="nb-card">
        <h1 className="nb-heading">Welcome to NetBird</h1>
        <p className="nb-subheading">
          Create the first admin account to get started
        </p>

        <form onSubmit={handleSubmit}>
          {errors.general && <div className="nb-error">{errors.general}</div>}

          <div className="nb-form-group">
            <label className="nb-label" htmlFor="name">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={handleInputChange("name")}
              placeholder="Your name"
              className={cn("nb-input", errors.name && "nb-input-error")}
              disabled={isSubmitting}
              autoFocus
            />
            {errors.name && (
              <span className="nb-field-error">{errors.name}</span>
            )}
          </div>

          <div className="nb-form-group">
            <label className="nb-label" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={handleInputChange("email")}
              placeholder="admin@example.com"
              className={cn("nb-input", errors.email && "nb-input-error")}
              disabled={isSubmitting}
            />
            {errors.email && (
              <span className="nb-field-error">{errors.email}</span>
            )}
          </div>

          <div className="nb-form-group">
            <label className="nb-label" htmlFor="password">
              Password
            </label>
            <div className="nb-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={formData.password}
                onChange={handleInputChange("password")}
                placeholder="Enter a strong password"
                className={cn("nb-input", errors.password && "nb-input-error")}
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="nb-password-toggle"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <span className="nb-hint">Must be at least 8 characters</span>
            {errors.password && (
              <span className="nb-field-error">{errors.password}</span>
            )}
          </div>

          <button type="submit" className="nb-btn" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                Creating Account...
              </>
            ) : (
              "Create Admin Account"
            )}
          </button>
        </form>

        <p className="nb-footer-text">
          This is a one-time setup for your NetBird instance.
        </p>
      </div>
      <style jsx>{styles}</style>
    </div>
  );
}

function NetBirdLogo() {
  return (
    <div className="nb-logo">
      <svg
        width="180"
        height="31"
        viewBox="0 0 133 23"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clipPath="url(#clip0)">
          <path
            d="M46.9438 7.5013C48.1229 8.64688 48.7082 10.3025 48.7082 12.4683V21.6663H46.1411V12.8362C46.1411 11.2809 45.7481 10.0851 44.9704 9.26566C44.1928 8.43783 43.1308 8.0281 41.7846 8.0281C40.4383 8.0281 39.3345 8.45455 38.5234 9.30747C37.7123 10.1604 37.3109 11.4063 37.3109 13.0369V21.6663H34.7188V6.06305H37.3109V8.28732C37.821 7.49294 38.5234 6.87416 39.4014 6.43934C40.2878 6.00452 41.2578 5.78711 42.3197 5.78711C44.2179 5.78711 45.7565 6.36408 46.9355 7.50966L46.9438 7.5013Z"
            fill="#F2F2F2"
          />
          <path
            d="M67.1048 14.8344H54.6288C54.7208 16.373 55.2476 17.5771 56.2092 18.4384C57.1708 19.2997 58.3331 19.7345 59.6961 19.7345C60.8166 19.7345 61.7531 19.4753 62.4973 18.9485C63.2499 18.4301 63.7767 17.7277 64.0777 16.858H66.8706C66.4525 18.3548 65.6163 19.5756 64.3621 20.5205C63.1078 21.4571 61.5525 21.9337 59.6878 21.9337C58.2077 21.9337 56.8865 21.5992 55.7159 20.9386C54.5452 20.278 53.6337 19.3331 52.9648 18.1039C52.2958 16.8831 51.9697 15.4616 51.9697 13.8477C51.9697 12.2339 52.2958 10.8207 52.9397 9.60825C53.5836 8.39578 54.495 7.45924 55.6573 6.80702C56.828 6.15479 58.1659 5.82031 59.6878 5.82031C61.2096 5.82031 62.4806 6.14643 63.6178 6.79029C64.7551 7.43416 65.6331 8.32052 66.2518 9.44938C66.8706 10.5782 67.18 11.8576 67.18 13.2791C67.18 13.7725 67.1549 14.2909 67.0964 14.8428L67.1048 14.8344ZM63.8603 10.1769C63.4255 9.4661 62.8318 8.92258 62.0793 8.55465C61.3267 8.18673 60.4989 8.00277 59.5874 8.00277C58.2746 8.00277 57.1625 8.42086 56.2427 9.25705C55.3228 10.0932 54.796 11.2472 54.6623 12.7356H64.5126C64.5126 11.7489 64.2952 10.896 63.8603 10.1852V10.1769Z"
            fill="#F2F2F2"
          />
          <path
            d="M73.7695 8.20355V17.4016C73.7695 18.1626 73.9284 18.6977 74.2545 19.0071C74.5806 19.3165 75.1409 19.4754 75.9352 19.4754H77.8418V21.6662H75.5088C74.0622 21.6662 72.9835 21.3317 72.2644 20.6711C71.5452 20.0105 71.1857 18.9151 71.1857 17.3933V8.19519H69.1621V6.0629H71.1857V2.13281H73.7779V6.0629H77.8501V8.19519H73.7779L73.7695 8.20355Z"
            fill="#F2F2F2"
          />
          <path
            d="M85.9022 6.68902C86.9307 6.10369 88.093 5.80266 89.4058 5.80266C90.8106 5.80266 92.0732 6.13714 93.1937 6.79773C94.3142 7.46668 95.2006 8.39485 95.8444 9.59896C96.4883 10.8031 96.8144 12.2079 96.8144 13.7966C96.8144 15.3854 96.4883 16.7818 95.8444 18.011C95.2006 19.2486 94.3142 20.2018 93.1854 20.8875C92.0565 21.5732 90.7939 21.916 89.4141 21.916C88.0344 21.916 86.8805 21.6234 85.8687 21.0297C84.8569 20.4443 84.0876 19.6918 83.5775 18.7803V21.6568H80.9854V0.601562H83.5775V8.97182C84.1127 8.04365 84.8904 7.28272 85.9105 6.69738L85.9022 6.68902ZM93.4529 10.7362C92.9763 9.86654 92.3408 9.19759 91.5297 8.74605C90.7186 8.29451 89.8322 8.06037 88.8706 8.06037C87.909 8.06037 87.0394 8.29451 86.2366 8.75441C85.4255 9.22268 84.7817 9.89163 84.2967 10.778C83.8117 11.6643 83.5692 12.6845 83.5692 13.8384C83.5692 14.9924 83.8117 16.046 84.2967 16.9323C84.7817 17.8187 85.4255 18.4877 86.2366 18.9559C87.0394 19.4242 87.9174 19.65 88.8706 19.65C89.8239 19.65 90.727 19.4158 91.5297 18.9559C92.3324 18.4877 92.9763 17.8187 93.4529 16.9323C93.9296 16.046 94.1637 15.0091 94.1637 13.8134C94.1637 12.6176 93.9296 11.6142 93.4529 10.7362Z"
            fill="#F2F2F2"
          />
          <path
            d="M100.318 3.01864C99.9749 2.67581 99.8076 2.25771 99.8076 1.76436C99.8076 1.27101 99.9749 0.852913 100.318 0.510076C100.661 0.167238 101.079 0 101.572 0C102.065 0 102.45 0.167238 102.784 0.510076C103.119 0.852913 103.286 1.27101 103.286 1.76436C103.286 2.25771 103.119 2.67581 102.784 3.01864C102.45 3.36148 102.049 3.52872 101.572 3.52872C101.095 3.52872 100.661 3.36148 100.318 3.01864ZM102.826 6.06237V21.6657H100.234V6.06237H102.826Z"
            fill="#F2F2F2"
          />
          <path
            d="M111.773 6.52155C112.617 6.0282 113.646 5.77734 114.867 5.77734V8.45315H114.181C111.28 8.45315 109.825 10.0252 109.825 13.1776V21.6649H107.232V6.06165H109.825V8.5953C110.276 7.70058 110.928 7.00654 111.773 6.51319V6.52155Z"
            fill="#F2F2F2"
          />
          <path
            d="M117.861 9.60732C118.505 8.40321 119.391 7.46668 120.52 6.80609C121.649 6.1455 122.92 5.81102 124.325 5.81102C125.537 5.81102 126.666 6.09533 127.711 6.64721C128.757 7.20746 129.551 7.94331 130.103 8.85475V0.601562H132.72V21.6735H130.103V18.7385C129.593 19.6667 128.832 20.436 127.828 21.0297C126.825 21.6317 125.646 21.9244 124.3 21.9244C122.953 21.9244 121.657 21.5816 120.528 20.8959C119.4 20.2102 118.513 19.257 117.869 18.0194C117.226 16.7818 116.899 15.377 116.899 13.805C116.899 12.233 117.226 10.8114 117.869 9.60732H117.861ZM129.392 10.7613C128.915 9.89163 128.28 9.22268 127.469 8.75441C126.658 8.28614 125.771 8.06037 124.81 8.06037C123.848 8.06037 122.962 8.28614 122.159 8.74605C121.356 9.20595 120.729 9.86654 120.253 10.7362C119.776 11.6058 119.542 12.6343 119.542 13.8134C119.542 14.9924 119.776 16.046 120.253 16.9323C120.729 17.8187 121.365 18.4877 122.159 18.9559C122.953 19.4242 123.84 19.65 124.81 19.65C125.78 19.65 126.666 19.4158 127.469 18.9559C128.272 18.4877 128.915 17.8187 129.392 16.9323C129.869 16.046 130.103 15.0175 130.103 13.8384C130.103 12.6594 129.869 11.6393 129.392 10.7613Z"
            fill="#F2F2F2"
          />
          <path
            d="M21.4651 0.568359C17.8193 0.902835 16.0047 3.00167 15.3191 4.06363L4.66602 22.5183H17.5182L30.1949 0.568359H21.4651Z"
            fill="#F68330"
          />
          <path
            d="M17.5265 22.5187L0 3.9302C0 3.9302 19.8177 -1.39633 21.7493 15.2188L17.5265 22.5187Z"
            fill="#F68330"
          />
          <path
            d="M14.9255 4.75055L9.54883 14.0657L17.5177 22.5196L21.7405 15.2029C21.0715 9.49174 18.287 6.37276 14.9255 4.74219"
            fill="#F35E32"
          />
        </g>
        <defs>
          <clipPath id="clip0">
            <rect width="132.72" height="22.5186" fill="white" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

const styles = `
  .nb-container {
    max-width: 820px;
    margin: 0 auto;
    padding: 40px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background-color: #18191d;
    font-family: ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji;
    font-size: 14px;
    line-height: 1.5;
    color: #e4e7e9;
  }

  .nb-logo {
    width: 180px;
    margin-bottom: 40px;
  }

  .nb-card {
    background-color: #1b1f22;
    border: 1px solid rgba(50, 54, 61, 0.5);
    border-radius: 12px;
    padding: 40px;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  }

  .nb-heading {
    font-size: 24px;
    font-weight: 500;
    text-align: center;
    margin: 0 0 24px 0;
    color: #fff;
  }

  .nb-subheading {
    font-size: 14px;
    color: rgba(167, 177, 185, 0.8);
    text-align: center;
    margin-bottom: 24px;
  }

  .nb-form-group {
    margin-bottom: 16px;
  }

  .nb-label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: #a7b1b9;
    margin-bottom: 6px;
  }

  .nb-input-wrapper {
    position: relative;
  }

  .nb-input {
    width: 100%;
    padding: 10px 14px;
    background-color: rgba(63, 68, 75, 0.5);
    border: 1px solid rgba(63, 68, 75, 0.8);
    border-radius: 8px;
    color: #e4e7e9;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
    font-family: inherit;
  }

  .nb-input:focus {
    border-color: #f68330;
  }

  .nb-input::placeholder {
    color: rgba(167, 177, 185, 0.5);
  }

  .nb-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .nb-input-error {
    border-color: rgba(153, 27, 27, 0.8);
  }

  .nb-input-wrapper .nb-input {
    padding-right: 44px;
  }

  .nb-password-toggle {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: rgba(167, 177, 185, 0.6);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }

  .nb-password-toggle:hover {
    color: #a7b1b9;
  }

  .nb-hint {
    display: block;
    font-size: 12px;
    color: rgba(167, 177, 185, 0.6);
    margin-top: 4px;
  }

  .nb-field-error {
    display: block;
    font-size: 12px;
    color: #f87171;
    margin-top: 4px;
  }

  .nb-btn {
    width: 100%;
    padding: 12px 20px;
    background-color: #f68330;
    border: none;
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
    font-family: inherit;
    margin-top: 8px;
  }

  .nb-btn:hover {
    background-color: #e5722a;
  }

  .nb-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .nb-error {
    background-color: rgba(153, 27, 27, 0.2);
    border: 1px solid rgba(153, 27, 27, 0.5);
    border-radius: 8px;
    padding: 12px 16px;
    color: #f87171;
    font-size: 13px;
    text-align: center;
    margin-bottom: 16px;
  }

  .nb-footer-text {
    font-size: 12px;
    color: rgba(167, 177, 185, 0.5);
    text-align: center;
    margin-top: 20px;
    margin-bottom: 0;
  }
`;
