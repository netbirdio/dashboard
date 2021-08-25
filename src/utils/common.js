export const formatDate = date => {
    return new Date(date).toLocaleDateString("en-GB", { weekday: 'short', year: '2-digit', month: 'short', day: 'numeric' });
}

export const classNames = (...classes) => {
    return classes.filter(Boolean).join(' ')
}