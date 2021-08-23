
export const formatDate = date => {
    return new Date(date).toLocaleDateString("en-GB", { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}