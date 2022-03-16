import React, { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/solid";

// connected Devices need to be set as state, so pagination can be rerendered
// Pagination controls how many peers currently connected to the network will be shown
//
// export default class Pagination extends React.Component {
